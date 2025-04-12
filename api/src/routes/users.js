/**
 * Users API Router
 * Handles all user-related operations including:
 * - Authentication (login)
 * - User management (create, read, update, delete)
 * - User administration
 * 
 * Permission model:
 * - Public endpoints: Login only
 * - User endpoints: Users can view/edit their own data
 * - Admin endpoints: Admins can manage all users
 * 
 * User types:
 * - Regular users: Can only manage their own profile
 * - Admin users: Can manage all users and assign admin privileges
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { requireAdmin } = require('../middleware/auth');

// Add JWT secret to environment variables or config
const YAMO_JWT_SECRET = process.env.YAMO_JWT_SECRET || 'default-secret-key-insecure-should-be-configured';

/**
 * POST /users/login
 * Authenticate a user and generate a JWT token
 * 
 * @body {string} username - Required username
 * @body {string} password - Required password
 * @permission Public - available to unauthenticated users
 * @returns {Object} User data and JWT token for authentication
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        error: 'Username and password are required'
      });
    }

    // Get user with password_hash and admin flag
    const [users] = await db.query(`
      SELECT id, username, password_hash, admin, created_at 
      FROM user 
      WHERE username = ?
    `, [username]);

    // Check if user exists
    if (users.length === 0) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    const user = users[0];
    // Convert admin flag from 0/1 to boolean
    user.admin = user.admin === 1;

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        admin: user.admin
      },
      YAMO_JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return user and token (without password)
    const { password_hash, ...userWithoutPassword } = user;
    res.status(200).json({
      user: userWithoutPassword,
      token
    });

  } catch (err) {
    console.error('Authentication error:', err);
    res.status(500).json({
      error: 'Authentication failed'
    });
  }
});

/**
 * GET /users
 * Get list of all users
 * 
 * @permission Admin only
 * @returns {Array} List of all users (excluding password data)
 */
router.get('/', requireAdmin, async (req, res) => {
  try {
    const [users] = await db.query(`
      SELECT id, username, admin, created_at 
      FROM user 
      ORDER BY username ASC
    `);

    res.status(200).json(users.map(user => {
      // Convert admin flag from 0/1 to boolean
      user.admin = user.admin === 1;
      return user;
    }));
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * GET /users/:id
 * Get a single user by ID
 * 
 * @param {number} id - User ID
 * @permission User can access their own data, admins can access any user
 * @returns {Object} User data (excluding password)
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is requesting their own info or is an admin
    if (req.user.id !== parseInt(id) && !req.user.admin) {
      return res.status(403).json({
        error: 'Access denied: You can only view your own user information'
      });
    }

    const [users] = await db.query(`
      SELECT id, username, admin, created_at 
      FROM user 
      WHERE id = ?
    `, [id]);

    if (users.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }
    const user = users[0];
    // Convert admin flag from 0/1 to boolean
    user.admin = user.admin === 1;
    res.status(200).json(user);

  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({
      error: 'Failed to fetch user'
    });
  }
});

/**
 * POST /users
 * Create a new user
 * 
 * @body {string} username - Required unique username
 * @body {string} password - Required password
 * @body {boolean} admin - Optional admin flag, defaults to false
 * @permission Admin only
 * @returns {Object} Newly created user (excluding password)
 */
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { username, password, admin = false } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        error: 'Username and password fields are required'
      });
    }

    // Check if username already exists
    const [existingUsers] = await db.query(
      'SELECT id FROM user WHERE username = ?',
      [username]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        error: 'Username already exists'
      });
    }

    // Generate password hash (salt is included in the hash)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert new user
    const [result] = await db.query(`
      INSERT INTO user (username, password_hash, admin)
      VALUES (?, ?, ?)
    `, [username, passwordHash, admin]);

    // Return new user (without sensitive data)
    res.status(201).json({
      id: result.insertId,
      username,
      admin,
      created_at: new Date()
    });

  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({
      error: 'Failed to create user'
    });
  }
});

/**
 * PUT /users/:id
 * Update an existing user
 * 
 * @param {number} id - User ID to update
 * @body {string} username - Optional new username
 * @body {string} password - Optional new password
 * @body {boolean} admin - Optional admin status flag
 * @permission User can update their own data (except admin flag), admins can update any user
 * @returns {Object} Updated user data (excluding password)
 * 
 * Note: Only admins can modify the admin flag. Regular users can only update
 * their own account information and cannot change their admin status.
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, admin } = req.body;

    // Check if user exists
    const [existingUsers] = await db.query(
      'SELECT id, admin FROM user WHERE id = ?',
      [id]
    );

    if (existingUsers.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Check permissions
    const isOwnAccount = req.user.id === parseInt(id);

    // Only admins can update admin flag
    if (admin !== undefined && !req.user.admin) {
      return res.status(403).json({
        error: 'Only administrators can change admin privileges'
      });
    }

    // Non-admins can only update their own account
    if (!isOwnAccount && !req.user.admin) {
      return res.status(403).json({
        error: 'You can only update your own user information'
      });
    }

    // Check if new username is already taken by another user
    if (username) {
      const [duplicateUsers] = await db.query(
        'SELECT id FROM user WHERE username = ? AND id != ?',
        [username, id]
      );

      if (duplicateUsers.length > 0) {
        return res.status(409).json({
          error: 'Username already exists'
        });
      }
    }

    // Build update query dynamically based on provided fields
    let updates = [];
    let params = [];

    if (username) {
      updates.push('username = ?');
      params.push(username);
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      updates.push('password_hash = ?');
      params.push(passwordHash);
    }

    // Only include admin update if the current user is an admin
    if (admin !== undefined && req.user.admin) {
      updates.push('admin = ?');
      params.push(admin);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'No fields to update'
      });
    }

    // Add id to params for WHERE clause
    params.push(id);

    // Update user
    await db.query(`
      UPDATE user 
      SET ${updates.join(', ')} 
      WHERE id = ?
    `, params);

    // Get updated user
    const [updatedUser] = await db.query(`
      SELECT id, username, admin, created_at 
      FROM user 
      WHERE id = ?
    `, [id]);
    const user = updatedUser[0];
    // Convert admin flag from 0/1 to boolean
    user.admin = user.admin === 1;
    res.status(200).json(user);

  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({
      error: 'Failed to update user'
    });
  }
});

/**
 * DELETE /users/:id
 * Delete a user
 * 
 * @param {number} id - User ID to delete
 * @permission Admin only, cannot delete own account
 * @returns {null} 204 No Content on success
 * 
 * Note: Users cannot delete their own accounts as a safety measure.
 * This prevents admins from accidentally removing their own access.
 */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const [existingUsers] = await db.query(
      'SELECT id FROM user WHERE id = ?',
      [id]
    );

    if (existingUsers.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Prevent self-deletion for safety
    if (req.user.id === parseInt(id)) {
      return res.status(400).json({
        error: 'You cannot delete your own account'
      });
    }

    // Delete user
    await db.query('DELETE FROM user WHERE id = ?', [id]);

    res.status(204).send();

  } catch (err) {
    // Handle foreign key constraint violations (user is referenced elsewhere)
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({
        error: 'Cannot delete user that is a member of workspaces'
      });
    }
    console.error('Database error:', err);
    res.status(500).json({
      error: 'Failed to delete user'
    });
  }
});

module.exports = router;
