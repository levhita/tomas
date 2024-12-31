const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all accounts
router.get('/', (req, res) => {
  try {
    const accounts = db.prepare(`
      SELECT * FROM account 
      ORDER BY name ASC
    `).all();
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// Get single account
router.get('/:id', (req, res) => {
  try {
    const account = db.prepare(`
      SELECT * FROM account 
      WHERE id = ?
    `).get(req.params.id);

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    res.json(account);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch account' });
  }
});

// Create account
router.post('/', (req, res) => {
  const { name, note = null, type = "debit", starting_amount = 0 } = req.body;
  console.log(req.body);
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const insert = db.prepare(`
      INSERT INTO account (name, note, type, starting_amount)
      VALUES (?, ?, ?, ?)
    `);

    const result = insert.run(name, note, type, starting_amount);

    const newAccount = db.prepare(`
      SELECT * FROM account 
      WHERE id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(newAccount);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// Update account
router.put('/:id', (req, res) => {
  const { name, note, type, starting_amount } = req.body;

  try {
    const update = db.prepare(`
      UPDATE account
      SET name = ?,
          note = ?,
          type = ?,
          starting_amount = ?
      WHERE id = ?
    `).run(name, note, type, starting_amount, req.params.id);

    if (update.changes === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const updated = db.prepare(`
      SELECT * FROM account 
      WHERE id = ?
    `).get(req.params.id);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update account' });
  }
});

// Delete account
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare(`
      DELETE FROM account
      WHERE id = ?
    `).run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

module.exports = router;