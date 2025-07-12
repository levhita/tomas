/**
 * Transactions API Router
 * Handles all transaction-related operations including:
 * - Listing transactions with filters (by account, date range)
 * - Retrieving single transaction details
 * - Creating, updating and deleting transactions
 * 
 * Permission model:
 * - READ operations: Any workspace member (admin, collaborator, viewer)
 * - WRITE operations: Workspace editors (admin, collaborator)
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { canRead, canWrite } = require('../utils/workspace');

/**
 * GET /transactions
 * List transactions with optional filtering
 * NOTE this implementation requires an accountId to filter transactions. would not
 * return all transactions for a workspace.
 * 
 * @query {number} accountId - Optional filter by account ID
 * @query {string} startDate - Optional start date (ISO format)
 * @query {string} endDate - Optional end date (ISO format)
 * @permission Read access to the account's workspace
 * @returns {Array} List of transactions
 */
router.get('/', async (req, res) => {
  const { accountId, startDate, endDate } = req.query;

  if (!accountId) {
    return res.status(400).json({ error: 'accountId is required' });
  }

  try {
    // First get the account to determine its workspace
    const [accounts] = await db.query(`
      SELECT workspace_id FROM account WHERE id = ?
    `, [accountId]);

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Check if user has read access to the account's workspace
    const workspaceId = accounts[0].workspace_id;
    const { allowed, message } = await canRead(workspaceId, req.user.id);

    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    // Build query with filters
    let query = `
      SELECT 
        t.*,
        c.name as category_name,
        a.name as account_name
      FROM transaction AS t
      LEFT JOIN category c ON t.category_id = c.id 
      LEFT JOIN account a ON t.account_id = a.id
      WHERE 1=1
    `;
    const params = [];

    if (accountId) {
      query += ` AND t.account_id = ?`;
      params.push(accountId);
    }

    if (startDate && endDate) {
      query += ` AND t.date BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }

    query += ` ORDER BY t.date ASC`;

    const [transactions] = await db.query(query, params);

    // Convert exercised from 0/1 to boolean
    transactions.forEach(t => t.exercised = !!t.exercised);
    res.status(200).json(transactions);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

/**
 * GET /transactions/:workspaceID/all
 * List all transactions for a workspace no matter what account is 
 * associated with them. This is useful for the dashboard view of transactions.
 * 
 * @param {number} workspaceID - Workspace ID
 * @permission Read access to the workspace
 * @returns {Array} List of transactions for the workspace
 */
router.get('/:workspaceId/all', async (req, res) => {
  const workspaceId = req.params.workspaceId;
  let { page = 1, limit = 20, sortKey = 'date', sortDirection = 'desc', accountId, search } = req.query;
  page = parseInt(page, 10);
  limit = parseInt(limit, 10);
  const offset = (page - 1) * limit;
  // Allowed sort keys and directions

  // allowedSortKeys type references the transaction type: Expense, Income, Payment, Charge
  // and the account_name references debit account or credit account
  // so we can sort by date, amount, description, account_name, category_name,
  // type (Expense, Income, Payment, Charge), note, id
  // but we need to ensure the sortKey is valid and the sortDirection is either asc or desc
  sortKey = sortKey.toLowerCase();
  sortDirection = sortDirection.toLowerCase();
  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(limit) || limit < 1) limit = 20;
  if (limit > 100) limit = 100; // Limit to a maximum of 100 items per page
  if (offset < 0) offset = 0;
  // Validate sortKey and sortDirection
  // We only allow certain keys to prevent SQL injection attacks
  // and we only allow asc or desc for sortDirection
  // We also need to ensure the sortKey is a valid column in the transaction table
  const allowedSortKeys = ['date', 'amount', 'description','account_name','category_name', 'type', 'note', 'id'];
  const allowedDirections = ['asc', 'desc'];
  if (!allowedSortKeys.includes(sortKey)) sortKey = 'date';
  if (!allowedDirections.includes(sortDirection)) sortDirection = 'desc';
  try {
    const { allowed, message } = await canRead(workspaceId, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
    }
    // Compose ORDER BY clause
    let orderBy;
    switch (sortKey) {
      case 'category_name':
        orderBy = 'c.name';
        break;
      case 'account_name':
        orderBy = 'a.name';
        break;
      case 'type':
          orderBy = `CASE 
            WHEN a.type = 'debit' AND t.amount > 0 THEN 'Income'
            WHEN a.type = 'debit' AND t.amount <= 0 THEN 'Expense'
            WHEN a.type = 'credit' AND t.amount < 0 THEN 'Payment'
            WHEN a.type = 'credit' AND t.amount >= 0 THEN 'Charge'
            ELSE 'Unknown'
          END`;
         break;
      case 'date':
      case 'amount':
      case 'description':
      case 'note':
      case 'id':
        orderBy = 't.' + sortKey;
        break;
      default:
        orderBy = 't.date'; // fallback to date if somehow an invalid key gets through
    }
    
    // Build WHERE clause
    let where = 'a.workspace_id = ?';
    const params = [workspaceId];
    if (accountId) {
      where += ' AND t.account_id = ?';
      params.push(accountId);
    }
    if (search) {
      where += ` AND (
        t.description LIKE ? OR
        t.note LIKE ? OR
        c.name LIKE ? OR
        a.name LIKE ?
      )`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    // Query paginated, sorted transactions
    const [transactions] = await db.query(`
      SELECT 
        t.*, 
        c.name as category_name, 
        a.name as account_name,
        a.type as account_type
      FROM transaction AS t
      LEFT JOIN category c ON t.category_id = c.id 
      LEFT JOIN account a ON t.account_id = a.id
      WHERE ${where}
      ORDER BY ${orderBy} ${sortDirection.toUpperCase()}
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);
    // Get total count
    const [countRows] = await db.query(
      `SELECT COUNT(*) as count FROM transaction t LEFT JOIN category c ON t.category_id = c.id LEFT JOIN account a ON t.account_id = a.id WHERE ${where}`,
      params
    );
    const count = countRows[0]?.count || 0;
    transactions.forEach(t => t.exercised = !!t.exercised);
    res.status(200).json({ transactions, total: count });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch transactions for workspace' });
  }
});

/**
 * GET /transactions/:id
 * Get details for a single transaction
 * 
 * @param {number} id - Transaction ID
 * @permission Read access to the account's workspace
 * @returns {Object} Transaction details
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

    // Get workspace ID for the account
    const [accounts] = await db.query(`
      SELECT workspace_id 
      FROM account 
      WHERE id = ?
    `, [transactionInfo[0].account_id]);

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Associated account not found' });
    }

    // Check if user has read access to this account's workspace
    const workspaceId = accounts[0].workspace_id;
    const { allowed, message } = await canRead(workspaceId, req.user.id);

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
 * POST /transactions
 * Create a new transaction
 * 
 * @body {string} description - Required transaction description
 * @body {string} note - Optional transaction note
 * @body {number} amount - Required transaction amount
 * @body {string} date - Required transaction date (ISO format)
 * @body {boolean} exercised - Whether transaction is exercised/cleared
 * @body {number} account_id - Required account ID
 * @body {number} category_id - Optional category ID
 * @permission Write access to the account's workspace
 * @returns {Object} Newly created transaction
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
    // First get the account to determine its workspace
    const [accounts] = await db.query(`
      SELECT workspace_id FROM account WHERE id = ?
    `, [account_id]);

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Check if user has write access to the account's workspace
    const workspaceId = accounts[0].workspace_id;
    const { allowed, message } = await canWrite(workspaceId, req.user.id);

    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    // If category is provided, verify it belongs to the same workspace
    if (category_id) {
      const [categories] = await db.query(`
        SELECT workspace_id FROM category WHERE id = ?
      `, [category_id]);

      if (categories.length === 0) {
        return res.status(404).json({ error: 'Category not found' });
      }

      if (categories[0].workspace_id !== workspaceId) {
        return res.status(400).json({ error: 'Category must belong to the same workspace as the account' });
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
 * PUT /transactions/:id
 * Update an existing transaction
 * 
 * @param {number} id - Transaction ID to update
 * @body {string} description - Required transaction description
 * @body {string} note - Optional transaction note
 * @body {number} amount - Required transaction amount
 * @body {string} date - Required transaction date (ISO format)
 * @body {boolean} exercised - Whether transaction is exercised/cleared
 * @body {number} account_id - Required account ID
 * @body {number} category_id - Optional category ID
 * @permission Write access to the transaction's account workspace
 * @returns {Object} Updated transaction
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

    // Get the account to determine its workspace
    const [accounts] = await db.query(`
      SELECT workspace_id FROM account WHERE id = ?
    `, [account_id]);

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Check if user has write access to the account's workspace
    const workspaceId = accounts[0].workspace_id;
    const { allowed, message } = await canWrite(workspaceId, req.user.id);

    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    // If category is provided, verify it belongs to the same workspace
    if (category_id) {
      const [categories] = await db.query(`
        SELECT workspace_id FROM category WHERE id = ?
      `, [category_id]);

      if (categories.length === 0) {
        return res.status(404).json({ error: 'Category not found' });
      }

      if (categories[0].workspace_id !== workspaceId) {
        return res.status(400).json({ error: 'Category must belong to the same workspace as the account' });
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
 * DELETE /transactions/:id
 * Delete a transaction
 * 
 * @param {number} id - Transaction ID to delete
 * @permission Write access to the transaction's account workspace
 * @returns {null} 204 No Content on success
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

    // Get workspace ID for the account
    const [accounts] = await db.query(`
      SELECT workspace_id 
      FROM account 
      WHERE id = ?
    `, [transactionInfo[0].account_id]);

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Associated account not found' });
    }

    // Check if user has write access to this account's workspace
    const workspaceId = accounts[0].workspace_id;
    const { allowed, message } = await canWrite(workspaceId, req.user.id);

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