const express = require('express');
const moment = require('moment');
const router = express.Router();
const db = require('../db');

// Get resume from month for the given account
router.get('/monthly/:id', async (req, res) => {
  const { date } = req.query;
  const { id } = req.params;

  if (!date) { return res.status(400).json({ error: 'Date is required' }); }

  const start = moment(date).startOf('month').format('YYYY-MM-DD');
  const end = moment(date).endOf('month').format('YYYY-MM-DD');

  try {
    const [accounts] = await db.query(`
      SELECT * FROM account
      WHERE id = ?
    `, [id]);

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const [transactions] = await db.query(`
      SELECT * FROM transaction
      WHERE account_id= ?
      AND date BETWEEN ? AND ?
      ORDER BY date ASC;
    `, [id, start, end]);

    const total = transactions.reduce((acc, transaction) => acc + (transaction.amount * 1), 0);
    const { name, note, type } = accounts[0]
    res.status(200).json({ id, name, type, start, end, total, transactions, note });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch account' });
  }
});

module.exports = router;