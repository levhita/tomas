const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all accounts
router.get('/', async (req, res) => {
  try {
    const [accounts] = await db.query(`
      SELECT * FROM account 
      ORDER BY name ASC
    `);
    res.status(200).json(accounts);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// Get single account
router.get('/:id', async (req, res) => {
  try {
    const [accounts] = await db.query(`
      SELECT * FROM account 
      WHERE id = ?
    `, [req.params.id]);

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }
    res.status(200).json(accounts[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch account' });
  }
});

// Create account
router.post('/', async (req, res) => {
  const { name, note = null, type = "debit", starting_amount = 0 } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const [result] = await db.query(`
      INSERT INTO account (name, note, type, starting_amount)
      VALUES (?, ?, ?, ?)
    `, [name, note, type, starting_amount]);

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

// Update account
router.put('/:id', async (req, res) => {
  const { name, note, type, starting_amount } = req.body;

  try {
    const [result] = await db.query(`
      UPDATE account
      SET name = ?,
          note = ?,
          type = ?,
          starting_amount = ?
      WHERE id = ?
    `, [name, note, type, starting_amount, req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const [accounts] = await db.query(`
      SELECT * FROM account 
      WHERE id = ?
    `, [req.params.id]);

    res.status(200).json(accounts[0]);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to update account' });
  }
});

// Delete account
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query(`
      DELETE FROM account
      WHERE id = ?
    `, [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }
    res.status(204).send();
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(428).json({ error: 'Cannot delete account with transactions' });
    }
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

module.exports = router;