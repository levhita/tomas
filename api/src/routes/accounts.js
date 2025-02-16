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


// Get account balance up to date
router.get('/:id/balance', async (req, res) => {
  const { id } = req.params;
  const { upToDate } = req.query;

  try {
    // Validate date format
    const dateTimestamp = new Date(upToDate).getTime();
    if (isNaN(dateTimestamp)) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const [result] = await db.query(`
      SELECT 
        SUM(CASE WHEN exercised = 1 THEN amount ELSE 0 END) as exercised_balance,
        SUM(amount) as projected_balance
      FROM transaction 
      WHERE account_id = ?
      AND date <= ?
    `, [id, upToDate]);

    res.status(200).json({
      exercised_balance: result[0].exercised_balance || 0,
      projected_balance: result[0].projected_balance || 0
    });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch account balance' });
  }
});

// Create account
router.post('/', async (req, res) => {
  const { name, note = null, type = "debit" } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const [result] = await db.query(`
      INSERT INTO account (name, note, type)
      VALUES (?, ?, ?)
    `, [name, note, type]);

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
  const { name, note, type } = req.body;

  try {
    const [result] = await db.query(`
      UPDATE account
      SET name = ?,
          note = ?,
          type = ?
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