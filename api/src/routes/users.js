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
 * @swagger
 * /users/login:
 *   post:
 *     summary: Authenticate a user and generate a JWT token
 *     description: Login endpoint for user authentication. Returns user data and JWT token for subsequent API calls.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: admin
 *               password:
 *                 type: string
 *                 format: password
 *                 example: secretpassword
 *     responses:
 *       200:
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Authentication failed due to server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @swagger
 * /users/search:
 *   get:
 *     summary: Search users by username (for adding to teams)
 *     description: Search for users by username with optional team membership status. Admin only endpoint.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query (username partial match)
 *         example: 'john'
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Maximum number of results
 *       - in: query
 *         name: team_id
 *         schema:
 *           type: integer
 *         description: Optional team ID to check membership status
 *     responses:
 *       200:
 *         description: List of matching users with membership status
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 allOf:
 *                   - $ref: '#/components/schemas/User'
 *                   - type: object
 *                     properties:
 *                       is_member:
 *                         type: boolean
 *                         description: Whether user is member of specified team
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         description: Failed to search users
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/search', requireSuperAdmin, async (req, res) => {
  try {
    const { q, limit = 10, team_id } = req.query;
    
    if (!q || q.trim().length < 1) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const searchTerm = `%${q.trim()}%`;
    const resultLimit = Math.min(parseInt(limit) || 10, 50); // Cap at 50 results
    
    let query = `
      SELECT 
        u.id, 
        u.username, 
        u.superadmin, 
        u.active,
        u.created_at,
        CASE 
          WHEN tu.user_id IS NOT NULL THEN 1 
          ELSE 0 
        END as is_team_member,
        tu.role as team_role
      FROM user u
      LEFT JOIN team_user tu ON u.id = tu.user_id ${team_id ? 'AND tu.team_id = ?' : ''}
      WHERE u.username LIKE ? 
        AND u.active = 1
    `;
    
    const queryParams = [];
    
    // Add team_id parameter if provided (for the LEFT JOIN)
    if (team_id) {
      queryParams.push(parseInt(team_id));
    }
    
    queryParams.push(searchTerm);
    
    query += ` ORDER BY u.username ASC LIMIT ?`;
    queryParams.push(resultLimit);
    
    const [users] = await db.query(query, queryParams);
    
    res.status(200).json(users.map(user => ({
      ...user,
      superadmin: user.superadmin === 1,
      active: user.active === 1,
      is_team_member: user.is_team_member === 1,
      team_role: user.team_role || null
    })));
  } catch (err) /* istanbul ignore next: unreachable in normal operation, only hit on db failure */{
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get list of all users with team statistics
 *     description: Retrieve a paginated list of all users with search and filtering capabilities. Admin only endpoint.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of users per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search query for username
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: ['superadmin', 'regular']
 *         description: Filter by user role
 *     responses:
 *       200:
 *         description: List of users with pagination info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/User'
 *                       - type: object
 *                         properties:
 *                           team_count:
 *                             type: integer
 *                             description: Number of teams user belongs to
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         description: Failed to fetch users
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', requireSuperAdmin, async (req, res) => {
  try {
    // Parse pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const role = req.query.role || '';
    const status = req.query.status || '';
    
    // Calculate offset
    const offset = (page - 1) * limit;
    
    // Build WHERE conditions
    let whereConditions = [];
    let queryParams = [];
    
    // Search filter
    if (search) {
      whereConditions.push('u.username LIKE ?');
      queryParams.push(`%${search}%`);
    }
    
    // Role filter
    if (role === 'superadmin') {
      whereConditions.push('u.superadmin = 1');
    } else if (role === 'user') {
      whereConditions.push('u.superadmin = 0');
    }
    
    // Status filter
    if (status === 'active') {
      whereConditions.push('u.active = 1');
    } else if (status === 'inactive') {
      whereConditions.push('u.active = 0');
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Get total count
    const [countResult] = await db.query(`
      SELECT COUNT(*) as total
      FROM user u
      ${whereClause}
    `, queryParams);
    
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);
    
    // Get paginated users
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
      ${whereClause}
      GROUP BY u.id, u.username, u.superadmin, u.active, u.created_at
      ORDER BY u.username ASC
      LIMIT ? OFFSET ?
    `, [...queryParams, limit, offset]);

    const formattedUsers = users.map(user => {
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
    });

    res.status(200).json({
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (err) /* istanbul ignore next: unreachable in normal operation, only hit on db failure */{
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Get current user's information
 *     description: Retrieve the authenticated user's profile information (excluding password).
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         description: Failed to fetch user information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
  } catch (err) /* istanbul ignore next: unreachable in normal operation, only hit on db failure */{
    console.error('Database error:', err);
    res.status(500).json({
      error: 'Failed to fetch user information'
    });
  }
});

/**
 * @swagger
 * /users/me/teams:
 *   get:
 *     summary: Get current user's teams
 *     description: Retrieve all teams that the authenticated user is a member of, including their roles in each team.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of teams the user has access to with their roles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 allOf:
 *                   - $ref: '#/components/schemas/Team'
 *                   - type: object
 *                     properties:
 *                       role:
 *                         type: string
 *                         enum: [admin, collaborator, viewer]
 *                         description: User's role in the team
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         description: Failed to fetch user teams
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/me/teams', authenticateToken, async (req, res) => {
  try {
    // Get user's team access
    const [teams] = await db.query(`
      SELECT 
        t.id, 
        t.name, 
        tu.role,
        t.created_at,
        t.deleted_at
      FROM team t
      INNER JOIN team_user tu ON t.id = tu.team_id
      WHERE tu.user_id = ?
      ORDER BY t.name ASC
    `, [req.user.id]);

    res.status(200).json(teams);
  } catch (err) /* istanbul ignore next: unreachable in normal operation, only hit on db failure */{
    console.error('Database error:', err);
    res.status(500).json({
      error: 'Failed to fetch user teams'
    });
  }
});

/**
 * @swagger
 * /users/select-team:
 *   post:
 *     summary: Select a team and generate new JWT token with team information
 *     description: Select a team context and receive a new JWT token that includes team information for subsequent API calls.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - team_id
 *             properties:
 *               team_id:
 *                 type: integer
 *                 example: 123
 *                 description: ID of the team to select
 *     responses:
 *       200:
 *         description: Team selected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                   description: New JWT token with team information
 *                 team:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 123
 *                     name:
 *                       type: string
 *                       example: "Family Budget Team"
 *                     role:
 *                       type: string
 *                       enum: [admin, collaborator, viewer]
 *                       example: "admin"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         description: Failed to select team
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/select-team', authenticateToken, async (req, res) => {
  try {
    const { team_id } = req.body;

    if (!team_id) {
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
    `, [req.user.id, team_id]);

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

  } catch (err) /* istanbul ignore next: unreachable in normal operation, only hit on db failure */{
    console.error('Database error:', err);
    res.status(500).json({
      error: 'Failed to select team'
    });
  }
});

/**
 * @swagger
 * /users/exit-team:
 *   post:
 *     summary: Exit team mode and return to admin mode
 *     description: Remove team information from JWT token and return to general user mode without team context.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully exited team mode
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                   description: New JWT token without team information
 *                 message:
 *                   type: string
 *                   example: "Successfully exited team mode"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         description: Failed to exit team mode
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/exit-team', authenticateToken, async (req, res) => {
  try {
    // Generate new JWT token without team information
    const token = jwt.sign(
      {
        userId: req.user.id,
        username: req.user.username,
        superadmin: req.user.superadmin
      },
      YAMO_JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      token,
      message: 'Successfully exited team mode'
    });

  } catch (err) /* istanbul ignore next: unreachable in normal operation, only hit on db failure */{
    console.error('Database error:', err);
    res.status(500).json({
      error: 'Failed to exit team mode'
    });
  }
});

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get a single user by ID
 *     description: Retrieve user information by ID. Users can access their own data, superadmins can access any user.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         description: Failed to fetch user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
    // Convert superadmin and active flags from 0/1 to boolean
    user.superadmin = user.superadmin === 1;
    user.active = user.active === 1;
    res.status(200).json(user);

  } catch (err) /* istanbul ignore next: unreachable in normal operation, only hit on db failure */{
    console.error('Database error:', err);
    res.status(500).json({
      error: 'Failed to fetch user'
    });
  }
});

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a new user
 *     description: Create a new user account. Only superadmins can create users and assign admin privileges.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 1
 *                 example: "john_doe"
 *                 description: Unique username for the new user
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 1
 *                 example: "securepassword123"
 *                 description: Password for the new user
 *               superadmin:
 *                 type: boolean
 *                 default: false
 *                 example: false
 *                 description: Whether the user should have superadmin privileges
 *               active:
 *                 type: boolean
 *                 default: true
 *                 example: true
 *                 description: Whether the user account should be active
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       409:
 *         description: Username already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to create user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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

  } catch (err) /* istanbul ignore next: unreachable in normal operation, only hit on db failure */{
    console.error('Database error:', err);
    res.status(500).json({
      error: 'Failed to create user'
    });
  }
});

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update an existing user
 *     description: |
 *       Update user information. Users can update their own data (except superadmin flag), 
 *       superadmins can update any user. Password changes for own account require current password.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: "new_username"
 *                 description: New username (must be unique)
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "newpassword123"
 *                 description: New password
 *               current_password:
 *                 type: string
 *                 format: password
 *                 example: "currentpassword"
 *                 description: Current password (required when user updates own password)
 *               superadmin:
 *                 type: boolean
 *                 example: false
 *                 description: Superadmin status (superadmin only)
 *               active:
 *                 type: boolean
 *                 example: true
 *                 description: Account active status (superadmin only)
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         description: Username already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to update user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, current_password, superadmin, active } = req.body;

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

    const existingUser = existingUsers[0];
    // Check permissions
    const isOwnAccount = req.user.id === parseInt(id);

    // Only superadmins can update superadmin flag and active status
    if (superadmin !== undefined && !req.user.superadmin) {
      return res.status(403).json({
        error: 'Only administrators can change admin privileges'
      });
    }

    if (active !== undefined && !req.user.superadmin) {
      return res.status(403).json({
        error: 'Only superadmins can change user active status'
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
      if (!current_password) {
        return res.status(400).json({
          error: 'Current password is required to change password'
        });
      }

      const isValidCurrentPassword = await bcrypt.compare(current_password, existingUser.password_hash);
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

  } catch (err) /* istanbul ignore next: unreachable in normal operation, only hit on db failure */{
    console.error('Database error:', err);
    res.status(500).json({
      error: 'Failed to update user'
    });
  }
});

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete a user
 *     description: |
 *       Permanently delete a user account. Superadmin only. Users cannot delete their own accounts 
 *       as a safety measure to prevent accidental loss of admin access.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID to delete
 *     responses:
 *       204:
 *         description: User deleted successfully (no content)
 *       400:
 *         description: Cannot delete own account
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         description: Cannot delete user that is a member of teams
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to delete user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
  }
});

/**
 * @swagger
 * /users/{id}/teams:
 *   get:
 *     summary: Get team access for a specific user
 *     description: Retrieve all teams that a specific user is a member of, including their roles. Superadmin only.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: List of teams the user has access to with their roles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 allOf:
 *                   - $ref: '#/components/schemas/Team'
 *                   - type: object
 *                     properties:
 *                       role:
 *                         type: string
 *                         enum: [admin, collaborator, viewer]
 *                         description: User's role in the team
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         description: When the user was added to the team
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         description: Failed to fetch user teams
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
        tu.created_at,
        t.deleted_at
      FROM team t
      INNER JOIN team_user tu ON t.id = tu.team_id
      WHERE tu.user_id = ?
      ORDER BY t.name ASC
    `, [id]);

    res.status(200).json(teams);
  } catch (err) /* istanbul ignore next: unreachable in normal operation, only hit on db failure */{
    console.error('Database error:', err);
    res.status(500).json({
      error: 'Failed to fetch user teams'
    });
  }
});

/**
 * @swagger
 * /users/{id}/enable:
 *   put:
 *     summary: Enable a user account
 *     description: Activate a disabled user account. Superadmin only.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User enabled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User enabled successfully"
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: User is already enabled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         description: Failed to enable user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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

  } catch (err) /* istanbul ignore next: unreachable in normal operation, only hit on db failure */{
    console.error('Database error:', err);
    res.status(500).json({
      error: 'Failed to enable user'
    });
  }
});

/**
 * @swagger
 * /users/{id}/disable:
 *   put:
 *     summary: Disable a user account
 *     description: Deactivate a user account. Superadmin only. Users cannot disable their own accounts.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User disabled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User disabled successfully"
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: User is already disabled or cannot disable own account
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         description: Failed to disable user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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

  } catch (err) /* istanbul ignore next: unreachable in normal operation, only hit on db failure */{
    console.error('Database error:', err);
    res.status(500).json({
      error: 'Failed to disable user'
    });
  }
});

module.exports = router;
