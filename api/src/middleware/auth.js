/**
 * Authentication Middleware Module
 * 
 * This module provides authentication and authorization middleware for the Yamo API.
 * It implements JWT-based authentication with token verification and user validation.
 * 
 * Key features:
 * - Token-based authentication using JSON Web Tokens (JWT)
 * - User verification against database records
 * - Role-based authorization for admin-only routes
 * - Public endpoint bypassing for specified routes
 */

const jwt = require('jsonwebtoken');
const db = require('../db');

// JWT secret key for token signing and verification
// In production, this should be set as an environment variable
const YAMO_JWT_SECRET = process.env.YAMO_JWT_SECRET || 'default-secret-key-insecure-should-be-configured';

/**
 * Main authentication middleware
 * 
 * This middleware:
 * 1. Extracts JWT token from Authorization header
 * 2. Verifies token signature and expiration
 * 3. Validates user exists in database
 * 4. Injects user object into request for downstream middleware/routes
 * 
 * Public endpoints (/, /users/login, /health) bypass authentication.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void} Calls next() if authenticated, returns error response if not
 */
async function authenticateToken(req, res, next) {
  // Skip authentication for public endpoints
  // This allows unauthenticated access to read the welcome pag
  if (req.path === '/') {
    return next();
  }
  // Skip authentication for login endpoint
  if (req.path === '/users/login') {
    return next();
  }
  // Skip authentication for health endpoint
  if (req.path === '/health') {
    return next();
  }

  // Extract token from Authorization header
  // Format should be: "Bearer <token>"
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  try {
    // Verify token with JWT secret
    // This validates signature and checks expiration
    const decoded = jwt.verify(token, YAMO_JWT_SECRET);

    // Validate user against database
    // This ensures the user still exists and matches token claims
    const [users] = await db.query(
      'SELECT id, username, superadmin FROM user WHERE id = ? AND username = ?',
      [decoded.userId, decoded.username]
    );

    if (users.length === 0) {
      return res.status(403).json({ error: 'Invalid user' });
    }

    // Validate admin claim from token against database
    // This prevents using a token with outdated privileges
    if (decoded.superadmin !== !!users[0].superadmin) {
      console.warn('Token superadmin claim mismatch for user:', decoded.userId);
      return res.status(403).json({ error: 'Token privileges invalid' });
    }

    // Convert database 0/1 to boolean for consistency
    users[0].superadmin = !!users[0].superadmin;

    // Inject user object into the request
    // This makes user data available to downstream middleware and route handlers
    req.user = users[0];

    // Continue to the next middleware or route handler
    next();
  } catch (err) {
    // Handle JWT verification errors
    // This captures expired tokens, invalid signatures, etc.
    console.error('Token verification error:', err);
    return res.status(403).json({ error: 'Invalid token' });
  }
}

/**
 * Middleware to require superadmin privileges
 * 
 * This middleware:
 * 1. Checks if the user is authenticated
 * 2. Verifies the user has admin privileges
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void} Calls next() if user is superadmin, returns error response if not
 */
function requireSuperAdmin(req, res, next) {
  // Check if user is authenticated and is a superadmin
  if (!req.user || !req.user.superadmin) {
    return res.status(403).json({ error: 'Admin privileges required' });
  }

  // Continue to the next middleware or route handler
  next();
}

module.exports = { authenticateToken, requireSuperAdmin };