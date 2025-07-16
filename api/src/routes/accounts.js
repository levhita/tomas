/**
 * Accounts API Router
 * Handles all account-related operations including:
 * - Listing accounts for a book
 * - Retrieving single account details
 * - Getting account balances
 * - Creating, updating and deleting accounts
 *
 * Permission model:
 * - READ operations: Any team member (admin, collaborator, viewer)
 * - WRITE operations: Admins and collaborators (accounts can be managed by write access)
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const {
  canRead,
  canWrite,
  canAdmin,
  getTeamByBookId,
  getTeamByAccountId
} = require('../utils/team');
const { getBookByAccountId } = require('../utils/book');

/**
 * @swagger
 * /accounts/{id}:
 *   get:
 *     summary: Get details for a single account
 *     description: Retrieve details for a specific account by ID. Requires read access to the account's book.
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Account ID
 *     responses:
 *       200:
 *         description: Account details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Account'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         description: Failed to fetch account
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', async (req, res) => {
  try {
    // First get the account
    const [accounts] = await db.query(
      `
      SELECT * FROM account 
      WHERE id = ?
    `,
      [req.params.id]
    );

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Use utility to get the team for this account
    const team = await getTeamByAccountId(req.params.id);
    if (!team) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const { allowed, message } = await canRead(team.id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    res.status(200).json(accounts[0]);
  } catch (err) /* istanbul ignore next: database error cannot be replicated */ {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch account' });
  }
});

/**
 * @swagger
 * /accounts/{id}/balance:
 *   get:
 *     summary: Get current balance for an account, optionally up to a specific date
 *     description: Calculate account balance with exercised and projected totals, optionally filtered by date.
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Account ID
 *       - in: query
 *         name: up_to_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Optional date filter in YYYY-MM-DD format
 *         example: '2024-04-30'
 *     responses:
 *       200:
 *         description: Account balance information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 account_id:
 *                   type: integer
 *                   example: 123
 *                 exercised_balance:
 *                   type: number
 *                   format: float
 *                   example: 1500.50
 *                   description: Balance from exercised transactions only
 *                 projected_balance:
 *                   type: number
 *                   format: float
 *                   example: 1200.75
 *                   description: Balance including all transactions
 *                 up_to_date:
 *                   type: string
 *                   format: date
 *                   nullable: true
 *                   example: '2024-04-30'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         description: Failed to calculate balance
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id/balance', async (req, res) => {
  const { id } = req.params;
  const { up_to_date } = req.query;

  try {
    // First get the account
    const [accounts] = await db.query(
      `
      SELECT * FROM account 
      WHERE id = ?
    `,
      [id]
    );

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Get team using utility function
    const team = await getTeamByAccountId(id);
    const { allowed, message } = await canRead(team.id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    // Validate date format if provided
    const dateTimestamp = new Date(up_to_date).getTime();
    if (up_to_date && isNaN(dateTimestamp)) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    // Get balance up to the specified date or current date if not specified
    const balanceDate = up_to_date || new Date().toISOString().split('T')[0];

    const [result] = await db.query(
      `
      SELECT 
        SUM(CASE WHEN exercised = 1 THEN amount ELSE 0 END) as exercised_balance,
        SUM(amount) as projected_balance
      FROM transaction 
      WHERE account_id = ?
      AND date <= ?
    `,
      [id, balanceDate]
    );

    res.status(200).json({
      exercised_balance: result[0].exercised_balance,
      projected_balance: result[0].projected_balance
    });
  } catch (err) /* istanbul ignore next: database error cannot be replicated */ {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch account balance' });
  }
});

/**
 * @swagger
 * /accounts:
 *   post:
 *     summary: Create a new account
 *     description: Create a new account within a book. Requires write access to the book via team membership.
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AccountInput'
 *     responses:
 *       201:
 *         description: Account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Account'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         description: Failed to create account
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', async (req, res) => {
  const { name, note = null, type = 'debit', book_id } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  if (!book_id) {
    return res.status(400).json({ error: 'book_id is required' });
  }

  try {
    // Verify user has write access to the book via team membership
    const team = await getTeamByBookId(book_id);
    if (!team) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const { allowed, message } = await canWrite(team.id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    // Insert the new account
    const [result] = await db.query(
      `
      INSERT INTO account (name, note, type, book_id)
      VALUES (?, ?, ?, ?)
    `,
      [name, note, type, book_id]
    );

    // Fetch the created account with all fields
    const [accounts] = await db.query(
      `
      SELECT * FROM account 
      WHERE id = ?
    `,
      [result.insertId]
    );

    res.status(201).json(accounts[0]);
  } catch (err) /* istanbul ignore next: database error cannot be replicated */ {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

/**
 * @swagger
 * /accounts/{id}:
 *   put:
 *     summary: Update an existing account
 *     description: Update all fields of an existing account. Requires write access to the account's book via team membership.
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Account ID to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: ['name', 'type']
 *             properties:
 *               name:
 *                 type: string
 *                 example: 'Updated Account Name'
 *               note:
 *                 type: string
 *                 nullable: true
 *                 example: 'Updated account description'
 *               type:
 *                 type: string
 *                 enum: ['debit', 'credit']
 *                 example: 'debit'
 *     responses:
 *       200:
 *         description: Account updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Account'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         description: Failed to update account
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', async (req, res) => {
  const { name, note, type } = req.body;

  try {
    // First get the account to determine its book
    const [accounts] = await db.query(
      `
      SELECT * FROM account 
      WHERE id = ?
    `,
      [req.params.id]
    );

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Check if user has write access to this account's book via team membership
    const team = await getTeamByAccountId(req.params.id);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const { allowed, message } = await canWrite(team.id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    // Update the account
    const [result] = await db.query(
      `
      UPDATE account
      SET name = ?,
          note = ?,
          type = ?
      WHERE id = ?
    `,
      [name, note, type, req.params.id]
    );

    // Fetch the updated account
    const [updatedAccounts] = await db.query(
      `
      SELECT * FROM account 
      WHERE id = ?
    `,
      [req.params.id]
    );

    res.status(200).json(updatedAccounts[0]);
  } catch (err) /* istanbul ignore next: database error cannot be replicated */ {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to update account' });
  }
});

/**
 * @swagger
 * /accounts/{id}:
 *   delete:
 *     summary: Delete an account
 *     description: Permanently delete an account. Cannot delete accounts that have associated transactions. Requires write access to the account's book.
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Account ID to delete
 *     responses:
 *       204:
 *         description: Account deleted successfully (no content)
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       428:
 *         description: Cannot delete account with transactions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               status: error
 *               message: Cannot delete account with transactions
 *               code: PRECONDITION_REQUIRED
 *       500:
 *         description: Failed to delete account
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', async (req, res) => {
  try {
    // First get the account to determine its book
    const [accounts] = await db.query(
      `
      SELECT * FROM account 
      WHERE id = ?
    `,
      [req.params.id]
    );

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Check if user has write access to this account's book via team membership
    const team = await getTeamByAccountId(req.params.id);
    if (!team) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const { allowed, message } = await canWrite(team.id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    // Check if there are any transactions with this account
    const [transactions] = await db.query(
      `
      SELECT COUNT(*) as count FROM transaction 
      WHERE account_id = ?
    `,
      [req.params.id]
    );

    if (transactions[0].count > 0) {
      return res.status(428).json({ error: 'Cannot delete account with transactions' });
    }

    // Delete the account
    const [result] = await db.query(
      `
      DELETE FROM account
      WHERE id = ?
    `,
      [req.params.id]
    );

    // Return no content on successful deletion
    res.status(204).send();
  } catch (err) /* istanbul ignore next: database error cannot be replicated */ {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

module.exports = router;
