const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Add JWT secret to environment variables or config
const YAMO_JWT_SECRET = process.env.YAMO_JWT_SECRET || 'default-secret-key-insecure-should-be-configured';

// Get all users
router.get('/', async (req, res) => {
  try {
    const [users] = await db.query(`
      SELECT id, username, created_at 
      FROM user 
      ORDER BY username ASC
    `);

    res.status(200).json(users);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [users] = await db.query(`
      SELECT id, username, created_at 
      FROM user 
      WHERE id = ?
    `, [id]);

    if (users.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.status(200).json(users[0]);

  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({
      error: 'Failed to fetch user'
    });
  }
});

// Create new user
router.post('/', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        error: 'Username and password are required'
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
      INSERT INTO user (username, password_hash)
      VALUES (?, ?)
    `, [username, passwordHash]);

    // Return new user (without sensitive data)
    res.status(201).json({
      id: result.insertId,
      username,
      created_at: new Date()
    });

  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({
      error: 'Failed to create user'
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        error: 'Username and password are required'
      });
    }

    // Get user with password_hash
    const [users] = await db.query(`
      SELECT id, username, password_hash, created_at 
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
        role: user.role
      },
      YAMO_JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return user and token
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

// Update user
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password } = req.body;

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

    // Update user fields
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
      SELECT id, username, created_at 
      FROM user 
      WHERE id = ?
    `, [id]);

    res.status(200).json(updatedUser[0]);

  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({
      error: 'Failed to update user'
    });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
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

    // Delete user
    await db.query('DELETE FROM user WHERE id = ?', [id]);

    res.status(204).send();

  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({
      error: 'Failed to delete user'
    });
  }
});

module.exports = router;
