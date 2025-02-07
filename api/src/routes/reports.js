const express = require('express');
// const moment = require('moment');
const router = express.Router();
const db = require('../db');

// // Get resume from month for the given account
// router.get('/monthly/:id', async (req, res) => {
//   const { date } = req.query;
//   const { id } = req.params;

//   if (!date) { return res.status(400).json({ error: 'Date is required' }); }

//   const start = moment(date).startOf('month').format('YYYY-MM-DD');
//   const end = moment(date).endOf('month').format('YYYY-MM-DD');

//   try {
//     const [accounts] = await db.query(`
//       SELECT * FROM account
//       WHERE id = ?
//     `, [id]);

//     if (accounts.length === 0) {
//       return res.status(404).json({ error: 'Account not found' });
//     }

//     const { name, note, type, opening_date } = accounts[0];

//     // We disallow dates before starting of month of account creation
//     if (start < moment(opening_date).startOf('month').format('YYYY-MM-DD')) {
//       return res.status(400).json({ error: 'Date is before account creation' })
//     }

//     const [transactions] = await db.query(`
//       SELECT 
//         t.*,
//         c.name as category_name
//       FROM transaction AS t
//       LEFT JOIN category c ON t.category_id = c.id
//       WHERE t.account_id = ?
//       AND t.date BETWEEN ? AND ?
//       ORDER BY t.date ASC;
//     `, [id, start, end]);

//     const total_projected = transactions.reduce((acc, transaction) => acc + (transaction.amount * 1), 0);
//     const total_exercised = transactions.reduce((acc, transaction) => {
//       if (transaction.exercised) {
//         return acc + (transaction.amount * 1)
//       } else {
//         return acc;
//       }
//     }, 0);

//     res.status(200).json({ id, name, type, opening_date, start, end, total_projected, total_exercised, transactions, note });
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to fetch account' });
//   }
// });

module.exports = router;