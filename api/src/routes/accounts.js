/**
 * Accounts API Router
 * Handles all account-related operations including:
 * - Listing accounts for a book
 * - Retrieving single account details
 * - Getting account balances
 * - Creating, updating and deleting accounts
 * 
 * Permission model:
 * - READ operations: Any book member (admin, collaborator, viewer)
 * - WRITE operations: Admins only (accounts require highest permission)
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { canRead, canWrite, canAdmin } = require('../utils/book');

/**
 * GET /accounts
 * List all accounts for a book
 * 
 * @query {number} book_id - Required book ID
 * @permission Read access to book (admin, collaborator, viewer)
 * @returns {Array} List of accounts
 */
router.get('/', async (req, res) => {
  const bookId = req.query.book_id;

  if (!bookId) {
    return res.status(400).json({ error: 'book_id is required' });
  }

  try {
    // Verify user has read access to the book
    const { allowed, message } = await canRead(bookId, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    const [accounts] = await db.query(`
      SELECT * FROM account 
      WHERE book_id = ?
      ORDER BY name ASC
    `, [bookId]);

    res.status(200).json(accounts);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

/**
 * GET /accounts/:id
 * Get details for a single account
 * 
 * @param {number} id - Account ID
 * @permission Read access to the account's book
 * @returns {Object} Account details
 */
router.get('/:id', async (req, res) => {
  try {
    // First get the account to determine its book
    const [accounts] = await db.query(`
      SELECT * FROM account 
      WHERE id = ?
    `, [req.params.id]);

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Check if user has read access to this account's book
    const bookId = accounts[0].book_id;
    const { allowed, message } = await canRead(bookId, req.user.id);

    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    res.status(200).json(accounts[0]);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch account' });
  }
});

/**
 * GET /accounts/:id/balance
 * Get current balance for an account, optionally up to a specific date
 * 
 * @param {number} id - Account ID
 * @query {string} upToDate - Optional date string in ISO format (e.g. 2023-04-30)
 * @permission Read access to the account's book
 * @returns {Object} Account balance information with exercised and projected totals
 */
router.get('/:id/balance', async (req, res) => {
  const { id } = req.params;
  const { upToDate } = req.query;

  try {
    // First get the account to determine its book
    const [accounts] = await db.query(`
      SELECT * FROM account 
      WHERE id = ?
    `, [id]);

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Check if user has read access to this account's book
    const bookId = accounts[0].book_id;
    const { allowed, message } = await canRead(bookId, req.user.id);

    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    // Validate date format if provided
    const dateTimestamp = new Date(upToDate).getTime();
    if (upToDate && isNaN(dateTimestamp)) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    // Get balance up to the specified date or current date if not specified
    const balanceDate = upToDate || new Date().toISOString().split('T')[0];

    const [result] = await db.query(`
      SELECT 
        SUM(CASE WHEN exercised = 1 THEN amount ELSE 0 END) as exercised_balance,
        SUM(amount) as projected_balance
      FROM transaction 
      WHERE account_id = ?
      AND date <= ?
    `, [id, balanceDate]);

    res.status(200).json({
      exercised_balance: result[0].exercised_balance || 0,
      projected_balance: result[0].projected_balance || 0
    });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch account balance' });
  }
});

/**
 * POST /accounts
 * Create a new account
 * 
 * @body {string} name - Required account name
 * @body {string} note - Optional account description
 * @body {string} type - Account type (debit or credit), defaults to debit
 * @body {number} book_id - Required book ID
 * @permission Admin access to the book
 * @returns {Object} Newly created account
 */
router.post('/', async (req, res) => {
  const { name, note = null, type = "debit", book_id } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  if (!book_id) {
    return res.status(400).json({ error: 'book_id is required' });
  }

  try {
    // Verify user has admin access to the book
    // (accounts are financial data so we require admin level)
    const { allowed, message } = await canAdmin(book_id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    // Insert the new account
    const [result] = await db.query(`
      INSERT INTO account (name, note, type, book_id)
      VALUES (?, ?, ?, ?)
    `, [name, note, type, book_id]);

    // Fetch the created account with all fields
    const [accounts] = await db.query(`
      SELECT * FROM account 
      WHERE id = ?
    `, [result.insertId]);

    res.status(201).json(accounts[0]);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

/**
 * PUT /accounts/:id
 * Update an existing account
 * 
 * @param {number} id - Account ID to update
 * @body {string} name - Account name
 * @body {string} note - Account description
 * @body {string} type - Account type (debit or credit)
 * @permission Admin access to the account's book
 * @returns {Object} Updated account
 */
router.put('/:id', async (req, res) => {
  const { name, note, type } = req.body;

  try {
    // First get the account to determine its book
    const [accounts] = await db.query(`
      SELECT * FROM account 
      WHERE id = ?
    `, [req.params.id]);

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Check if user has admin access to this account's book
    const bookId = accounts[0].book_id;
    const { allowed, message } = await canAdmin(bookId, req.user.id);

    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    // Update the account
    const [result] = await db.query(`
      UPDATE account
      SET name = ?,
          note = ?,
          type = ?
      WHERE id = ?
    `, [name, note, type, req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Fetch the updated account
    const [updatedAccounts] = await db.query(`
      SELECT * FROM account 
      WHERE id = ?
    `, [req.params.id]);

    res.status(200).json(updatedAccounts[0]);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to update account' });
  }
});

/**
 * DELETE /accounts/:id
 * Delete an account
 * 
 * @param {number} id - Account ID to delete
 * @permission Admin access to the account's book
 * @returns {null} 204 No Content on success
 * @throws {Error} 428 Precondition Required if account has transactions
 */
router.delete('/:id', async (req, res) => {
  try {
    // First get the account to determine its book
    const [accounts] = await db.query(`
      SELECT * FROM account 
      WHERE id = ?
    `, [req.params.id]);

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Check if user has admin access to this account's book
    const bookId = accounts[0].book_id;
    const { allowed, message } = await canAdmin(bookId, req.user.id);

    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    // Delete the account
    const [result] = await db.query(`
      DELETE FROM account
      WHERE id = ?
    `, [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Return no content on successful deletion
    res.status(204).send();
  } catch (err) {
    // Specific error for foreign key constraint violation
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(428).json({ error: 'Cannot delete account with transactions' });
    }
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

module.exports = router;