const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all transactions
router.get('/', (req, res) => {
  try {
    const transactions = db.prepare(`
      SELECT 
        t.*,
        c.name as category_name,
        a.name as account_name
      FROM "transaction" t
      LEFT JOIN category c ON t.category_id = c.id 
      LEFT JOIN account a ON t.account_id = a.id
      ORDER BY t.created_at DESC
    `).all();
    res.status(200).json(transactions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get single transaction 
router.get('/:id', (req, res) => {
  try {
    const transaction = db.prepare(`
      SELECT 
        t.*,
        c.name as category_name,
        a.name as account_name
      FROM "transaction" t
      LEFT JOIN category c ON t.category_id = c.id
      LEFT JOIN account a ON t.account_id = a.id
      WHERE t.id = ?
    `).get(req.params.id);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.status(200).json(transaction);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// Create transaction
router.post('/', (req, res) => {
  const { description, note = null, amount, date, exercised, account_id, category_id = null } = req.body;
  console.log(req.body);

  let exercisedValue = 0;
  if (exercised) {
    exercisedValue = 1;
  }

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
    const insert = db.prepare(`
      INSERT INTO "transaction" (
        description,
        note,
        amount,
        date,
        exercised,
        account_id,
        category_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(description, note, amount, date, exercisedValue, account_id, category_id);

    const newTransaction = db.prepare(`
      SELECT * FROM "transaction" 
      WHERE id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(newTransaction);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// Update transaction
router.put('/:id', (req, res) => {
  const { description, note, amount, date, exercised, account_id, category_id } = req.body;

  if (date) {
    const dateTimestamp = new Date(date).getTime();
    if (isNaN(dateTimestamp)) {
      return res.status(400).json({ error: 'Invalid date' });
    }
  } else {
    return res.status(400).json({ error: 'Date is required' });
  }

  try {
    const update = db.prepare(`
      UPDATE "transaction"
      SET description = ?,
          note = ?,
          amount = ?,
          date = ?,
          exercised = ?,
          account_id = ?,
          category_id = ?
      WHERE id = ?
    `).run(description, note, amount, date, exercised, account_id, category_id, req.params.id);

    if (update.changes === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const updated = db.prepare(`
      SELECT * FROM "transaction" 
      WHERE id = ?
    `).get(req.params.id);

    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// Delete transaction
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare(`
      DELETE FROM "transaction"
      WHERE id = ?
    `).run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

module.exports = router;