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
const { canRead, canWrite, getTeamByAccountId } = require('../utils/team');
const { getBookById, getBookByAccountId } = require('../utils/book');

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
    const [transactionInfo] = await db.query(
      `
      SELECT account_id 
      FROM transaction 
      WHERE id = ?
    `,
      [req.params.id]
    );

    if (transactionInfo.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Validate that the book for this account is not soft-deleted
    const book = await getBookByAccountId(transactionInfo[0].account_id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const team = await getTeamByAccountId(transactionInfo[0].account_id);

    const { allowed, message } = await canRead(team.id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    // Get full transaction with joins
    const [transactions] = await db.query(
      `
      SELECT 
        t.*,
        c.name as category_name,
        a.name as account_name
      FROM transaction AS t
      LEFT JOIN category c ON t.category_id = c.id
      LEFT JOIN account a ON t.account_id = a.id
      WHERE t.id = ?
    `,
      [req.params.id]
    );

    // Force return a boolean value for exercised
    transactions[0].exercised = !!transactions[0].exercised;
    res.status(200).json(transactions[0]);
  } catch (err) /* istanbul ignore next: database error cannot be replicated */ {
    if (err.status === 404 && err.message === 'Book not found') {
      return res.status(404).json({ error: 'Book not found' });
    }
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
  const {
    description,
    note = null,
    amount,
    date,
    exercised,
    account_id,
    category_id = null
  } = req.body;
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
    // Get the account to determine its book
    const [accounts] = await db.query(
      `
      SELECT book_id FROM account WHERE id = ?
    `,
      [account_id]
    );

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Validate that the book for this account is not soft-deleted
    const book = await getBookById(accounts[0].book_id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const team = await getTeamByAccountId(account_id);

    const { allowed, message } = await canWrite(team.id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    // If category is provided, verify it belongs to the same book
    if (category_id) {
      // Validate that category_id is a number
      if (typeof category_id !== 'number' || isNaN(category_id)) {
        return res.status(400).json({ error: 'category_id must be a number' });
      }

      const [categories] = await db.query(
        `
        SELECT * FROM category WHERE id = ?
      `,
        [category_id]
      );
      if (categories.length === 0) {
        return res.status(404).json({ error: 'Category not found' });
      }

      if (categories[0].book_id !== book.id) {
        return res
          .status(400)
          .json({ error: 'Category must belong to the same book as the account' });
      }
    }

    // Create the transaction
    const [result] = await db.query(
      `
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
    `,
      [description, note, amount, date, exercisedValue, account_id, category_id]
    );

    // Fetch the created transaction with all fields
    const [transactions] = await db.query(
      `
      SELECT 
        t.*,
        c.name as category_name,
        a.name as account_name
      FROM transaction AS t
      LEFT JOIN category c ON t.category_id = c.id
      LEFT JOIN account a ON t.account_id = a.id
      WHERE t.id = ?
    `,
      [result.insertId]
    );

    // Force return a boolean value for exercised
    transactions[0].exercised = !!transactions[0].exercised;
    res.status(201).json(transactions[0]);
  } catch (err) /* istanbul ignore next: database error cannot be replicated */ {
    if (err.status === 404 && err.message === 'Book not found') {
      return res.status(404).json({ error: 'Book not found' });
    }
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

  // Validate date format
  if (date) {
    const dateTimestamp = new Date(date).getTime();
    if (isNaN(dateTimestamp)) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
  }

  // Only require at least one updatable field for update, not all fields
  const updatableFields = [
    'description',
    'note',
    'amount',
    'date',
    'exercised',
    'account_id',
    'category_id'
  ];
  const hasAnyField = updatableFields.some((field) => req.body[field] !== undefined);

  if (!hasAnyField) {
    return res.status(400).json({
      error: 'At least one field must be provided for update'
    });
  }

  try {
    // First get the transaction to check it exists and get its current account_id
    const [existingTransactionRows] = await db.query('SELECT * FROM transaction WHERE id = ?', [
      req.params.id
    ]);

    if (existingTransactionRows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const existingTransaction = existingTransactionRows[0];
    // Use provided account_id if present, otherwise use the one from the transaction
    const effectiveAccountId =
      account_id !== undefined ? account_id : existingTransaction.account_id;

    // Get the account to determine its book
    const [accounts] = await db.query(
      `
      SELECT book_id FROM account WHERE id = ?
      `,
      [effectiveAccountId]
    );

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Validate that the book for this account is not soft-deleted
    const book = await getBookById(accounts[0].book_id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const team = await getTeamByAccountId(effectiveAccountId);

    const { allowed, message } = await canWrite(team.id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    // If category is provided, verify it belongs to the same book
    if (category_id) {
      const [categories] = await db.query(
        `
        SELECT * FROM category WHERE id = ?
        `,
        [category_id]
      );

      if (categories.length === 0) {
        return res.status(404).json({ error: 'Category not found' });
      }

      if (categories[0].book_id !== book.id) {
        return res
          .status(400)
          .json({ error: 'Category must belong to the same book as the account' });
      }
    }

    // Update the transaction
    const [result] = await db.query(
      `
      UPDATE transaction
      SET description = ?,
          note = ?,
          amount = ?,
          date = ?,
          exercised = ?,
          account_id = ?,
          category_id = ?
      WHERE id = ?
      `,
      [
        description,
        note,
        amount,
        date,
        exercisedValue,
        effectiveAccountId,
        category_id,
        req.params.id
      ]
    );

    // Fetch the updated transaction
    const [transactions] = await db.query(
      `
      SELECT 
        t.*,
        c.name as category_name,
        a.name as account_name
      FROM transaction AS t
      LEFT JOIN category c ON t.category_id = c.id
      LEFT JOIN account a ON t.account_id = a.id
      WHERE t.id = ?
      `,
      [req.params.id]
    );

    // Force return a boolean value for exercised
    transactions[0].exercised = !!transactions[0].exercised;
    res.status(200).json(transactions[0]);
  } catch (err) /* istanbul ignore next: database error cannot be replicated */ {
    if (err.status === 404 && err.message === 'Book not found') {
      return res.status(404).json({ error: 'Book not found' });
    }
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
    const [transactionInfo] = await db.query(
      `
      SELECT account_id 
      FROM transaction 
      WHERE id = ?
    `,
      [req.params.id]
    );

    if (transactionInfo.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Validate that the book for this account is not soft-deleted
    const book = await getBookByAccountId(transactionInfo[0].account_id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const team = await getTeamByAccountId(transactionInfo[0].account_id);

    const { allowed, message } = await canWrite(team.id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    // Delete the transaction
    const [result] = await db.query(
      `
      DELETE FROM transaction
      WHERE id = ?
    `,
      [req.params.id]
    );

    res.status(204).send();
  } catch (err) /* istanbul ignore next: database error cannot be replicated */ {
    if (err.status === 404 && err.message === 'Book not found') {
      return res.status(404).json({ error: 'Book not found' });
    }
    console.error('Database error:', err);
    res.status(500).json({ error: 'Database error when deleting transaction' });
  }
});

module.exports = router;
