const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all transactions
router.get('/', async (req, res) => {
  const { accountId, startDate, endDate } = req.query;

  try {
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

    transactions.forEach(t => t.exercised = !!t.exercised);
    res.status(200).json(transactions);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get single transaction 
router.get('/:id', async (req, res) => {
  try {
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

    if (transactions.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    // Force return a boolean value for exercised
    transactions[0].exercised = !!transactions[0].exercised;
    res.status(200).json(transactions[0]);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// Create transaction
router.post('/', async (req, res) => {
  const { description, note = null, amount, date, exercised, account_id, category_id = null } = req.body;
  const exercisedValue = exercised ? 1 : 0;

  if (date) {
    const dateTimestamp = new Date(date).getTime();
    if (isNaN(dateTimestamp)) {
      return res.status(400).json({ error: 'Invalid date' });
    }
  } else {
    return res.status(400).json({ error: 'Date is required' });
  }

  if (!description || amount === undefined) {
    return res.status(400).json({ error: 'Description and amount are required' });
  }

  try {
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

// Update transaction
router.put('/:id', async (req, res) => {
  const { description, note, amount, date, exercised, account_id, category_id } = req.body;
  const exercisedValue = exercised ? 1 : 0;

  if (date) {
    const dateTimestamp = new Date(date).getTime();
    if (isNaN(dateTimestamp)) {
      return res.status(400).json({ error: 'Invalid date' });
    }
  } else {
    return res.status(400).json({ error: 'Date is required' });
  }

  try {
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

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

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

// Delete transaction
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query(`
      DELETE FROM transaction
      WHERE id = ?
    `, [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.status(204).send();
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Database error when deleting transaction' });
  }
});

module.exports = router;