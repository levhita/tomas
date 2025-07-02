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

    // Get user with password_hash, admin flag, and active status
    const [users] = await db.query(`
      SELECT id, username, password_hash, superadmin, active, created_at 
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
    user.active = user.active === 1;

    // Check if user is active
    if (!user.active) {
      return res.status(401).json({
        error: 'Account is disabled'
      });
    }

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
 * Get list of all users with team statistics
 * 
 * @permission SuperAdmin only
 * @returns {Array} List of all users (excluding password data) with team counts
 */
router.get('/', requireSuperAdmin, async (req, res) => {
  try {
    const [users] = await db.query(`
      SELECT 
        u.id, 
        u.username, 
        u.superadmin, 
        u.active,
        u.created_at,
        COUNT(DISTINCT tu.team_id) as team_count,
        COUNT(DISTINCT CASE WHEN tu.role = 'admin' THEN tu.team_id END) as admin_teams,
        COUNT(DISTINCT CASE WHEN tu.role = 'collaborator' THEN tu.team_id END) as collaborator_teams,
        COUNT(DISTINCT CASE WHEN tu.role = 'viewer' THEN tu.team_id END) as viewer_teams
      FROM user u
      LEFT JOIN team_user tu ON u.id = tu.user_id 
      LEFT JOIN team t ON tu.team_id = t.id AND t.deleted_at IS NULL
      GROUP BY u.id, u.username, u.superadmin, u.active, u.created_at
      ORDER BY u.username ASC
    `);

    res.status(200).json(users.map(user => {
      // Convert admin and active flags from 0/1 to boolean and team counts to numbers
      return {
        ...user,
        superadmin: user.superadmin === 1,
        active: user.active === 1,
        team_count: parseInt(user.team_count) || 0,
        admin_teams: parseInt(user.admin_teams) || 0,
        collaborator_teams: parseInt(user.collaborator_teams) || 0,
        viewer_teams: parseInt(user.viewer_teams) || 0
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
      SELECT id, username, superadmin, active, created_at 
      FROM user 
      WHERE id = ?
    `, [req.user.id]);

    if (users.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const user = users[0];
    // Convert superadmin and active flags from 0/1 to boolean
    user.superadmin = user.superadmin === 1;
    user.active = user.active === 1;

    res.status(200).json(user);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({
      error: 'Failed to fetch user information'
    });
  }
});

/**
 * GET /users/me/teams
 * Get current user's teams
 * 
 * @permission Authenticated user
 * @returns {Array} List of teams the user has access to with their roles
 */
router.get('/me/teams', authenticateToken, async (req, res) => {
  try {
    // Get user's team access
    const [teams] = await db.query(`
      SELECT 
        t.id, 
        t.name, 
        tu.role,
        t.created_at
      FROM team t
      INNER JOIN team_user tu ON t.id = tu.team_id
      WHERE tu.user_id = ?
      ORDER BY t.name ASC
    `, [req.user.id]);

    res.status(200).json(teams);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({
      error: 'Failed to fetch user teams'
    });
  }
});

/**
 * POST /users/select-team
 * Select a team and generate new JWT token with team information
 * 
 * @body {number} teamId - Team ID to select
 * @permission Authenticated user
 * @returns {Object} New JWT token with team information
 */
router.post('/select-team', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.body;

    if (!teamId) {
      return res.status(400).json({
        error: 'Team ID is required'
      });
    }

    // Verify user has access to this team
    const [teamAccess] = await db.query(`
      SELECT 
        t.id, 
        t.name, 
        tu.role
      FROM team t
      INNER JOIN team_user tu ON t.id = tu.team_id
      WHERE tu.user_id = ? AND t.id = ?
    `, [req.user.id, teamId]);

    if (teamAccess.length === 0) {
      return res.status(403).json({
        error: 'Access denied: You do not have access to this team'
      });
    }

    const team = teamAccess[0];

    // Generate new JWT token with team information
    const token = jwt.sign(
      {
        userId: req.user.id,
        username: req.user.username,
        superadmin: req.user.superadmin,
        teamId: team.id,
        teamName: team.name,
        teamRole: team.role
      },
      YAMO_JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      token,
      team: {
        id: team.id,
        name: team.name,
        role: team.role
      }
    });

  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({
      error: 'Failed to select team'
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
      SELECT id, username, superadmin, active, created_at 
      FROM user 
      WHERE id = ?
    `, [id]);

    if (users.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }
    const user = users[0];
    // Convert admin and active flags from 0/1 to boolean
    user.superadmin = user.superadmin === 1;
    user.active = user.active === 1;
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
 * @body {string} password - Required password
 * @body {boolean} superadmin - Optional admin flag, defaults to false
 * @body {boolean} active - Optional active flag, defaults to true
 * @permission Admin only
 * @returns {Object} Newly created user (excluding password)
 */
router.post('/', requireSuperAdmin, async (req, res) => {
  try {
    const { username, password, superadmin = false, active = true } = req.body;

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
      INSERT INTO user (username, password_hash, superadmin, active)
      VALUES (?, ?, ?, ?)
    `, [username, passwordHash, superadmin, active]);

    // Fetch the newly created user to ensure consistent data format
    const [newUser] = await db.query(`
      SELECT id, username, superadmin, active, created_at 
      FROM user 
      WHERE id = ?
    `, [result.insertId]);

    const user = newUser[0];
    // Convert superadmin and active flags from 0/1 to boolean
    user.superadmin = user.superadmin === 1;
    user.active = user.active === 1;

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
    const { username, password, currentPassword, superadmin, active } = req.body;

    // Check if user exists
    const [existingUsers] = await db.query(
      'SELECT id, superadmin, password_hash FROM user WHERE id = ?',
      [id]
    );

    if (existingUsers.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const existingUser = existingUsers.length > 0 ? existingUsers[0] : null;
    if (!existingUser) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Check permissions
    const isOwnAccount = req.user.id === parseInt(id);

    // Only admins can update admin flag and active status
    if (superadmin !== undefined && !req.user.superadmin) {
      return res.status(403).json({
        error: 'Only administrators can change admin privileges'
      });
    }

    if (active !== undefined && !req.user.superadmin) {
      return res.status(403).json({
        error: 'Only administrators can change user active status'
      });
    }

    // Non-admins can only update their own account
    if (!isOwnAccount && !req.user.superadmin) {
      return res.status(403).json({
        error: 'You can only update your own user information'
      });
    }

    // Verify current password if user is updating their own password
    if (password && isOwnAccount && !req.user.superadmin) {
      if (!currentPassword) {
        return res.status(400).json({
          error: 'Current password is required to change password'
        });
      }

      const isValidCurrentPassword = await bcrypt.compare(currentPassword, existingUser.password_hash);
      if (!isValidCurrentPassword) {
        return res.status(401).json({
          error: 'Current password is incorrect'
        });
      }
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

    // Only include active update if the current user is a superadmin
    if (active !== undefined && req.user.superadmin) {
      updates.push('active = ?');
      params.push(active);
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
      SELECT id, username, superadmin, active, created_at 
      FROM user 
      WHERE id = ?
    `, [id]);
    const user = updatedUser[0];
    // Convert boolean fields from 0/1 to boolean
    user.superadmin = user.superadmin === 1;
    user.active = user.active === 1;
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
        error: 'Cannot delete user that is a member of teams'
      });
    }
    console.error('Database error:', err);
    res.status(500).json({
      error: 'Failed to delete user'
    });
  }
});

/**
 * GET /users/:id/teams
 * Get team access for a specific user
 * 
 * @param {number} id - User ID
 * @permission Super admin only
 * @returns {Array} List of teams the user has access to with their roles
 */
router.get('/:id/teams', requireSuperAdmin, async (req, res) => {
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

    // Get user's team access
    const [teams] = await db.query(`
      SELECT 
        t.id, 
        t.name, 
        tu.role,
        t.created_at
      FROM team t
      INNER JOIN team_user tu ON t.id = tu.team_id
      WHERE tu.user_id = ?
      ORDER BY t.name ASC
    `, [id]);

    res.status(200).json(teams);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({
      error: 'Failed to fetch user teams'
    });
  }
});

/**
 * PUT /users/:id/enable
 * Enable a user account
 * 
 * @permission SuperAdmin only
 * @param {number} id - User ID
 * @returns {Object} Updated user data
 */
router.put('/:id/enable', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const [users] = await db.query(`
      SELECT id, username, active, superadmin, created_at
      FROM user 
      WHERE id = ?
    `, [id]);

    if (users.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const user = users[0];

    // Check if user is already active
    if (user.active) {
      return res.status(400).json({
        error: 'User is already enabled'
      });
    }

    // Enable the user
    await db.query(`
      UPDATE user 
      SET active = 1 
      WHERE id = ?
    `, [id]);

    // Return updated user data
    const updatedUser = {
      ...user,
      active: true,
      superadmin: user.superadmin === 1
    };

    res.status(200).json({
      message: 'User enabled successfully',
      user: updatedUser
    });

  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({
      error: 'Failed to enable user'
    });
  }
});

/**
 * PUT /users/:id/disable
 * Disable a user account
 * 
 * @permission SuperAdmin only
 * @param {number} id - User ID
 * @returns {Object} Updated user data
 */
router.put('/:id/disable', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent superadmins from disabling themselves
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({
        error: 'Cannot disable your own account'
      });
    }

    // Check if user exists
    const [users] = await db.query(`
      SELECT id, username, active, superadmin, created_at
      FROM user 
      WHERE id = ?
    `, [id]);

    if (users.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const user = users[0];

    // Check if user is already inactive
    if (!user.active) {
      return res.status(400).json({
        error: 'User is already disabled'
      });
    }

    // Disable the user
    await db.query(`
      UPDATE user 
      SET active = 0 
      WHERE id = ?
    `, [id]);

    // Return updated user data
    const updatedUser = {
      ...user,
      active: false,
      superadmin: user.superadmin === 1
    };

    res.status(200).json({
      message: 'User disabled successfully',
      user: updatedUser
    });

  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({
      error: 'Failed to disable user'
    });
  }
});

module.exports = router;
