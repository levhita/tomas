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
const { authenticateToken, requireSuperAdmin } = require('../middleware/auth');

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
      SELECT id, username, password_hash, superadmin, created_at 
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
    user.superadmin = user.superadmin === 1;

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
        superadmin: user.superadmin
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
 * Get list of all users with workspace statistics
 * 
 * @permission SuperAdmin only
 * @returns {Array} List of all users (excluding password data) with workspace counts
 */
router.get('/', requireSuperAdmin, async (req, res) => {
  try {
    const [users] = await db.query(`
      SELECT 
        u.id, 
        u.username, 
        u.superadmin, 
        u.created_at,
        COUNT(DISTINCT wu.workspace_id) as workspace_count,
        COUNT(DISTINCT CASE WHEN wu.role = 'admin' THEN wu.workspace_id END) as admin_workspaces,
        COUNT(DISTINCT CASE WHEN wu.role = 'collaborator' THEN wu.workspace_id END) as collaborator_workspaces,
        COUNT(DISTINCT CASE WHEN wu.role = 'viewer' THEN wu.workspace_id END) as viewer_workspaces
      FROM user u
      LEFT JOIN workspace_user wu ON u.id = wu.user_id 
      LEFT JOIN workspace w ON wu.workspace_id = w.id AND w.deleted_at IS NULL
      GROUP BY u.id, u.username, u.superadmin, u.created_at
      ORDER BY u.username ASC
    `);

    res.status(200).json(users.map(user => {
      // Convert admin flag from 0/1 to boolean and workspace counts to numbers
      return {
        ...user,
        superadmin: user.superadmin === 1,
        workspace_count: parseInt(user.workspace_count) || 0,
        admin_workspaces: parseInt(user.admin_workspaces) || 0,
        collaborator_workspaces: parseInt(user.collaborator_workspaces) || 0,
        viewer_workspaces: parseInt(user.viewer_workspaces) || 0
      };
    }));
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * GET /users/me
 * Get current user's information
 * 
 * @permission Authenticated user
 * @returns {Object} Current user data (excluding password)
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // The user information is already available from the auth middleware
    // But we'll fetch fresh data from the database to ensure it's up to date
    const [users] = await db.query(`
      SELECT id, username, superadmin, created_at 
      FROM user 
      WHERE id = ?
    `, [req.user.id]);

    if (users.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const user = users[0];
    // Convert superadmin flag from 0/1 to boolean
    user.superadmin = user.superadmin === 1;

    res.status(200).json(user);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({
      error: 'Failed to fetch user information'
    });
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
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is requesting their own info or is a superadmin
    if (req.user.id !== parseInt(id) && !req.user.superadmin) {
      return res.status(403).json({
        error: 'Access denied: You can only view your own user information'
      });
    }

    const [users] = await db.query(`
      SELECT id, username, superadmin, created_at 
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
    user.superadmin = user.superadmin === 1;
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
router.post('/', requireSuperAdmin, async (req, res) => {
  try {
    const { username, password, superadmin = false } = req.body;

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
      INSERT INTO user (username, password_hash, superadmin)
      VALUES (?, ?, ?)
    `, [username, passwordHash, superadmin]);

    // Fetch the newly created user to ensure consistent data format
    const [newUser] = await db.query(`
      SELECT id, username, superadmin, created_at 
      FROM user 
      WHERE id = ?
    `, [result.insertId]);

    const user = newUser[0];
    // Convert superadmin flag from 0/1 to boolean
    user.superadmin = user.superadmin === 1;

    // Return new user (without sensitive data)
    res.status(201).json(user);

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
    const { username, password, superadmin } = req.body;

    // Check if user exists
    const [existingUsers] = await db.query(
      'SELECT id, superadmin FROM user WHERE id = ?',
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
    if (superadmin !== undefined && !req.user.superadmin) {
      return res.status(403).json({
        error: 'Only administrators can change admin privileges'
      });
    }

    // Non-admins can only update their own account
    if (!isOwnAccount && !req.user.superadmin) {
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

    // Only include superadmin update if the current user is a superadmin
    if (superadmin !== undefined && req.user.superadmin) {
      updates.push('superadmin = ?');
      params.push(superadmin);
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
      SELECT id, username, superadmin, created_at 
      FROM user 
      WHERE id = ?
    `, [id]);
    const user = updatedUser[0];
    // Convert admin flag from 0/1 to boolean
    user.superadmin = user.superadmin === 1;
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
router.delete('/:id', requireSuperAdmin, async (req, res) => {
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

/**
 * GET /users/:id/workspaces
 * Get workspace access for a specific user
 * 
 * @param {number} id - User ID
 * @permission Super admin only
 * @returns {Array} List of workspaces the user has access to with their roles
 */
router.get('/:id/workspaces', requireSuperAdmin, async (req, res) => {
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

    // Get user's workspace access
    const [workspaces] = await db.query(`
      SELECT 
        w.id, 
        w.name, 
        w.note,
        wu.role,
        w.created_at,
        w.currency_symbol
      FROM workspace w
      INNER JOIN workspace_user wu ON w.id = wu.workspace_id
      WHERE wu.user_id = ? AND w.deleted_at IS NULL
      ORDER BY w.name ASC
    `, [id]);

    res.status(200).json(workspaces);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({
      error: 'Failed to fetch user workspaces'
    });
  }
});

/**
 * POST /users/:id/workspaces
 * Add user to a workspace with specified role
 * 
 * @param {number} id - User ID
 * @body {number} workspaceId - Workspace ID to add user to
 * @body {string} role - Role to assign (admin, collaborator, viewer)
 * @permission Super admin only
 * @returns {Array} Updated list of user's workspaces
 */
router.post('/:id/workspaces', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { workspaceId, role } = req.body;

    if (!workspaceId || !role) {
      return res.status(400).json({
        error: 'Workspace ID and role are required'
      });
    }

    if (!['admin', 'collaborator', 'viewer'].includes(role)) {
      return res.status(400).json({
        error: 'Valid role is required (admin, collaborator, or viewer)'
      });
    }

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

    // Check if workspace exists
    const [existingWorkspaces] = await db.query(
      'SELECT id FROM workspace WHERE id = ? AND deleted_at IS NULL',
      [workspaceId]
    );

    if (existingWorkspaces.length === 0) {
      return res.status(404).json({
        error: 'Workspace not found'
      });
    }

    // Check if user is already in workspace
    const [existing] = await db.query(
      'SELECT 1 FROM workspace_user WHERE workspace_id = ? AND user_id = ?',
      [workspaceId, id]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        error: 'User already has access to this workspace'
      });
    }

    // Add user to workspace
    await db.query(
      'INSERT INTO workspace_user (workspace_id, user_id, role) VALUES (?, ?, ?)',
      [workspaceId, id, role]
    );

    // Return updated list
    const [workspaces] = await db.query(`
      SELECT 
        w.id, 
        w.name, 
        w.note,
        wu.role,
        w.created_at,
        w.currency_symbol
      FROM workspace w
      INNER JOIN workspace_user wu ON w.id = wu.workspace_id
      WHERE wu.user_id = ? AND w.deleted_at IS NULL
      ORDER BY w.name ASC
    `, [id]);

    res.status(201).json(workspaces);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({
      error: 'Failed to add user to workspace'
    });
  }
});

/**
 * PUT /users/:id/workspaces/:workspaceId
 * Update user's role in a workspace
 * 
 * @param {number} id - User ID
 * @param {number} workspaceId - Workspace ID
 * @body {string} role - New role (admin, collaborator, viewer)
 * @permission Super admin only
 * @returns {Array} Updated list of user's workspaces
 */
router.put('/:id/workspaces/:workspaceId', requireSuperAdmin, async (req, res) => {
  try {
    const { id, workspaceId } = req.params;
    const { role } = req.body;

    if (!role || !['admin', 'collaborator', 'viewer'].includes(role)) {
      return res.status(400).json({
        error: 'Valid role is required (admin, collaborator, or viewer)'
      });
    }

    // Update user's role in workspace
    const [result] = await db.query(
      'UPDATE workspace_user SET role = ? WHERE workspace_id = ? AND user_id = ?',
      [role, workspaceId, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'User workspace access not found'
      });
    }

    // Return updated list
    const [workspaces] = await db.query(`
      SELECT 
        w.id, 
        w.name, 
        w.note,
        wu.role,
        w.created_at,
        w.currency_symbol
      FROM workspace w
      INNER JOIN workspace_user wu ON w.id = wu.workspace_id
      WHERE wu.user_id = ? AND w.deleted_at IS NULL
      ORDER BY w.name ASC
    `, [id]);

    res.status(200).json(workspaces);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({
      error: 'Failed to update user workspace role'
    });
  }
});

/**
 * DELETE /users/:id/workspaces/:workspaceId
 * Remove user from a workspace
 * 
 * @param {number} id - User ID
 * @param {number} workspaceId - Workspace ID
 * @permission Super admin only
 * @returns {Array} Updated list of user's workspaces
 */
router.delete('/:id/workspaces/:workspaceId', requireSuperAdmin, async (req, res) => {
  try {
    const { id, workspaceId } = req.params;

    // Check if this would remove the last admin from the workspace
    const [adminCount] = await db.query(`
      SELECT COUNT(*) as count 
      FROM workspace_user 
      WHERE workspace_id = ? AND role = 'admin'
    `, [workspaceId]);

    const [currentRole] = await db.query(`
      SELECT role 
      FROM workspace_user 
      WHERE workspace_id = ? AND user_id = ?
    `, [workspaceId, id]);

    if (adminCount[0].count === 1 && currentRole[0]?.role === 'admin') {
      return res.status(400).json({
        error: 'Cannot remove the last admin from the workspace'
      });
    }

    // Remove user from workspace
    const [result] = await db.query(
      'DELETE FROM workspace_user WHERE workspace_id = ? AND user_id = ?',
      [workspaceId, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'User workspace access not found'
      });
    }

    // Return updated list
    const [workspaces] = await db.query(`
      SELECT 
        w.id, 
        w.name, 
        w.note,
        wu.role,
        w.created_at,
        w.currency_symbol
      FROM workspace w
      INNER JOIN workspace_user wu ON w.id = wu.workspace_id
      WHERE wu.user_id = ? AND w.deleted_at IS NULL
      ORDER BY w.name ASC
    `, [id]);

    res.status(200).json(workspaces);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({
      error: 'Failed to remove user from workspace'
    });
  }
});

module.exports = router;
