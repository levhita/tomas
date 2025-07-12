/**
 * Transactions API Router
 * Handles individual transaction operations including:
 * - Retrieving single transaction details
 * - Creating, updating and deleting transactions
 * 
 * Note: Transaction listing is handled by /books/:id/transactions endpoint
 * 
 * Permission model:
 * - READ operations: Any team member (admin, collaborator, viewer)
 * - WRITE operations: Team editors (admin, collaborator)
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { canRead, canWrite, getTeamByBookId } = require('../utils/team');



/**
 * @swagger
 * /transactions/{id}:
 *   get:
 *     summary: Get details for a single transaction
 *     description: Retrieve details for a specific transaction by ID. Requires read access to the account's book.
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Transaction ID
 *     responses:
 *       200:
 *         description: Transaction details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         description: Failed to fetch transaction
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', async (req, res) => {
  try {
    // First get transaction with its account ID
    const [transactionInfo] = await db.query(`
      SELECT account_id 
      FROM transaction 
      WHERE id = ?
    `, [req.params.id]);

    if (transactionInfo.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Get book ID for the account
    const [accounts] = await db.query(`
      SELECT book_id 
      FROM account 
      WHERE id = ?
    `, [transactionInfo[0].account_id]);

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Associated account not found' });
    }

    // Check if user has access to this account's book via team membership
    const bookId = accounts[0].book_id;
    const team = await getTeamByBookId(bookId);

    if (!team) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const { allowed, message } = await canRead(team.id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    // Get full transaction with joins
    const [transactions] = await db.query(`
      SELECT 
        t.*,
        c.name as category_name,
        a.name as account_name
      FROM transaction AS t
      LEFT JOIN category c ON t.category_id = c.id
      LEFT JOIN account a ON t.account_id = a.id
      WHERE t.id = ?
    `, [req.params.id]);

    // Force return a boolean value for exercised
    transactions[0].exercised = !!transactions[0].exercised;
    res.status(200).json(transactions[0]);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

/**
 * @swagger
 * /transactions:
 *   post:
 *     summary: Create a new transaction
 *     description: Create a new transaction within an account. Requires write access to the account's book.
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TransactionInput'
 *     responses:
 *       201:
 *         description: Transaction created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         description: Failed to create transaction
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', async (req, res) => {
  const { description, note = null, amount, date, exercised, account_id, category_id = null } = req.body;
  const exercisedValue = exercised ? 1 : 0;

  // Validate required fields
  const requiredFields = {
    description: description,
    amount: amount,
    date: date,
    account_id: account_id
  };

  const missingFields = Object.entries(requiredFields)
    .filter(([_, value]) => value === undefined || value === null || value === '')
    .map(([field]) => field);

  if (missingFields.length > 0) {
    return res.status(400).json({
      error: `Missing required fields: ${missingFields.join(', ')}`
    });
  }

  // Validate date format
  const dateTimestamp = new Date(date).getTime();
  if (isNaN(dateTimestamp)) {
    return res.status(400).json({ error: 'Invalid date format' });
  }

  try {
    // First get the account to determine its book
    const [accounts] = await db.query(`
      SELECT book_id FROM account WHERE id = ?
    `, [account_id]);

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Check if user has write access to the account's book via team membership
    const bookId = accounts[0].book_id;
    const team = await getTeamByBookId(bookId);

    if (!team) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const { allowed, message } = await canWrite(team.id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    // If category is provided, verify it belongs to the same book
    if (category_id) {
      const [categories] = await db.query(`
        SELECT book_id FROM category WHERE id = ?
      `, [category_id]);

      if (categories.length === 0) {
        return res.status(404).json({ error: 'Category not found' });
      }

      if (categories[0].book_id !== bookId) {
        return res.status(400).json({ error: 'Category must belong to the same book as the account' });
      }
    }

    // Create the transaction
    const [result] = await db.query(`
      INSERT INTO transaction (
        description,
        note,
        amount,
        date,
        exercised,
        account_id,
        category_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [description, note, amount, date, exercisedValue, account_id, category_id]);

    // Fetch the created transaction with all fields
    const [transactions] = await db.query(`
      SELECT 
        t.*,
        c.name as category_name,
        a.name as account_name
      FROM transaction AS t
      LEFT JOIN category c ON t.category_id = c.id
      LEFT JOIN account a ON t.account_id = a.id
      WHERE t.id = ?
    `, [result.insertId]);

    // Force return a boolean value for exercised
    transactions[0].exercised = !!transactions[0].exercised;
    res.status(201).json(transactions[0]);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

/**
 * @swagger
 * /transactions/{id}:
 *   put:
 *     summary: Update an existing transaction
 *     description: Update all fields of an existing transaction. Requires write access to the transaction's account book.
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Transaction ID to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TransactionInput'
 *     responses:
 *       200:
 *         description: Transaction updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         description: Failed to update transaction
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', async (req, res) => {
  const { description, note, amount, date, exercised, account_id, category_id } = req.body;
  const exercisedValue = exercised ? 1 : 0;

  // Validate required fields
  const requiredFields = {
    description: description,
    amount: amount,
    date: date,
    account_id: account_id
  };

  const missingFields = Object.entries(requiredFields)
    .filter(([_, value]) => value === undefined || value === null || value === '')
    .map(([field]) => field);

  if (missingFields.length > 0) {
    return res.status(400).json({
      error: `Missing required fields: ${missingFields.join(', ')}`
    });
  }

  // Validate date format
  const dateTimestamp = new Date(date).getTime();
  if (isNaN(dateTimestamp)) {
    return res.status(400).json({ error: 'Invalid date format' });
  }

  try {
    // First get the transaction to check it exists
    const [existingTransaction] = await db.query(
      'SELECT id FROM transaction WHERE id = ?',
      [req.params.id]
    );

    if (existingTransaction.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Get the account to determine its book
    const [accounts] = await db.query(`
      SELECT book_id FROM account WHERE id = ?
    `, [account_id]);

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Check if user has write access to the account's book via team membership
    const bookId = accounts[0].book_id;
    const team = await getTeamByBookId(bookId);

    if (!team) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const { allowed, message } = await canWrite(team.id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    // If category is provided, verify it belongs to the same book
    if (category_id) {
      const [categories] = await db.query(`
        SELECT book_id FROM category WHERE id = ?
      `, [category_id]);

      if (categories.length === 0) {
        return res.status(404).json({ error: 'Category not found' });
      }

      if (categories[0].book_id !== bookId) {
        return res.status(400).json({ error: 'Category must belong to the same book as the account' });
      }
    }

    // Update the transaction
    const [result] = await db.query(`
      UPDATE transaction
      SET description = ?,
          note = ?,
          amount = ?,
          date = ?,
          exercised = ?,
          account_id = ?,
          category_id = ?
      WHERE id = ?
    `, [description, note, amount, date, exercisedValue, account_id, category_id, req.params.id]);

    // Fetch the updated transaction
    const [transactions] = await db.query(`
      SELECT 
        t.*,
        c.name as category_name,
        a.name as account_name
      FROM transaction AS t
      LEFT JOIN category c ON t.category_id = c.id
      LEFT JOIN account a ON t.account_id = a.id
      WHERE t.id = ?
    `, [req.params.id]);

    // Force return a boolean value for exercised
    transactions[0].exercised = !!transactions[0].exercised;
    res.status(200).json(transactions[0]);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

/**
 * @swagger
 * /transactions/{id}:
 *   delete:
 *     summary: Delete a transaction
 *     description: Permanently delete a transaction. Requires write access to the transaction's account book.
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Transaction ID to delete
 *     responses:
 *       204:
 *         description: Transaction deleted successfully (no content)
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         description: Failed to delete transaction
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', async (req, res) => {
  try {
    // First get transaction with its account ID
    const [transactionInfo] = await db.query(`
      SELECT account_id 
      FROM transaction 
      WHERE id = ?
    `, [req.params.id]);

    if (transactionInfo.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Get book ID for the account
    const [accounts] = await db.query(`
      SELECT book_id 
      FROM account 
      WHERE id = ?
    `, [transactionInfo[0].account_id]);

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Associated account not found' });
    }

    // Check if user has write access to this account's book via team membership
    const bookId = accounts[0].book_id;
    const team = await getTeamByBookId(bookId);

    if (!team) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const { allowed, message } = await canWrite(team.id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    // Delete the transaction
    const [result] = await db.query(`
      DELETE FROM transaction
      WHERE id = ?
    `, [req.params.id]);

    res.status(204).send();
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Database error when deleting transaction' });
  }
});

module.exports = router;