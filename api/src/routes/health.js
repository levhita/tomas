// api/src/routes/health.js
const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    // Simple database connectivity check
    await db.query('SELECT 1');
    res.status(200).json({ status: 'healthy' });
  } catch (err) {
    console.error('Health check failed:', err);
    res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

module.exports = router;