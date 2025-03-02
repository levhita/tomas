const jwt = require('jsonwebtoken');
const db = require('../db');

const YAMO_JWT_SECRET = process.env.YAMO_JWT_SECRET || 'default-secret-key-insecure-should-be-configured';

async function authenticateToken(req, res, next) {
  // Skip authentication for login endpoint
  if (req.path === '/users/login') {
    return next();
  }
  // Skip authentication for health endpoint
  if (req.path === '/health') {
    return next();
  }

  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  try {
    const decoded = jwt.verify(token, YAMO_JWT_SECRET);

    // Check if user exists and matches token data
    const [users] = await db.query(
      'SELECT id, username FROM user WHERE id = ? AND username = ?',
      [decoded.userId, decoded.username]
    );

    if (users.length === 0) {
      return res.status(403).json({ error: 'Invalid user' });
    }

    req.user = users[0];
    next();
  } catch (err) {
    console.error('Token verification error:', err);
    return res.status(403).json({ error: 'Invalid token' });
  }
}

module.exports = authenticateToken;