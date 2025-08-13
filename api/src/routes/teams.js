/**
 * Teams API Router
 * Handles all team-related operations including:
 * - Managing teams (create, read, update)
 * - User access management for teams
 * - Role assignment within teams
 * 
 * Permission model:
 * - READ operations: Any team member (admin, collaborator, viewer)
 * - WRITE operations: Team editors (admin, collaborator)
 * - ADMIN operations: Team admins only
 * 
 * Team roles:
 * - admin: Full control including user management and team settings
 * - collaborator: Can edit team content (books, accounts, transactions) but not manage users
 * - viewer: Read-only access to team content
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireSuperAdmin } = require('../middleware/auth');
const {
  canAdmin,
  canWrite,
  canRead,
  getTeamUsers,
  getTeamById,
  getUserRole
} = require('../utils/team');

/**
 * @swagger
 * /teams:
 *   get:
 *     summary: List all teams accessible to the current user
 *     description: Retrieve all teams that the authenticated user is a member of, including their role in each team.
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of teams the user has access to
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Team'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         description: Failed to fetch teams
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', async (req, res) => {
  try {
    const [teams] = await db.query(`
      SELECT t.*, tu.role 
      FROM team t
      INNER JOIN team_user tu ON t.id = tu.team_id
      WHERE tu.user_id = ? AND t.deleted_at IS NULL
      ORDER BY t.name ASC
    `, [req.user.id]);

    res.status(200).json(teams);
  } catch (err) /* istanbul ignore next: unreachable in normal operation, only hit on db failure */{
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

/**
 * @swagger
 * /teams/search:
 *   get:
 *     summary: Search teams by name
 *     description: Search for teams by name. Admin only endpoint for team management.
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query for team names
 *         example: 'budget'
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Maximum number of results
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include deleted teams in results
 *     responses:
 *       200:
 *         description: List of teams matching the search criteria
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Team'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         description: Failed to search teams
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/search', requireSuperAdmin, async (req, res) => {
  try {
    const searchTerm = req.query.q || '';
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const includeDeleted = req.query.includeDeleted === 'true';

    let query, params;

    if (!searchTerm.trim()) {
      // If no search term, return all teams
      query = `
        SELECT id, name, created_at, deleted_at
        FROM team 
        ${includeDeleted ? '' : 'WHERE deleted_at IS NULL'}
        ORDER BY name ASC
        LIMIT ?
      `;
      params = [limit];
    } else {
      // Search by team name (partial match, case-insensitive)
      query = `
        SELECT id, name, created_at, deleted_at
        FROM team 
        WHERE name LIKE ? ${includeDeleted ? '' : 'AND deleted_at IS NULL'}
        ORDER BY 
          CASE WHEN name = ? THEN 0 ELSE 1 END,
          LENGTH(name) ASC,
          name ASC
        LIMIT ?
      `;
      params = [`%${searchTerm}%`, searchTerm, limit];
    }

    const [teams] = await db.query(query, params);
    res.status(200).json(teams);
  } catch (err) /* istanbul ignore next: unreachable in normal operation, only hit on db failure */ {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to search teams' });
  }
});

/**
 * @swagger
 * /teams/all:
 *   get:
 *     summary: Get all teams with statistics (superadmin only)
 *     description: |
 *       Retrieve all teams with comprehensive statistics including user counts and book counts.
 *       Can filter to show only soft-deleted teams (recycle bin).
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: deleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: If true, return only soft-deleted teams (recycle bin). Default returns active teams.
 *     responses:
 *       200:
 *         description: List of all teams with statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 allOf:
 *                   - $ref: '#/components/schemas/Team'
 *                   - type: object
 *                     properties:
 *                       user_count:
 *                         type: integer
 *                         example: 5
 *                       admin_count:
 *                         type: integer
 *                         example: 2
 *                       collaborator_count:
 *                         type: integer
 *                         example: 2
 *                       viewer_count:
 *                         type: integer
 *                         example: 1
 *                       book_count:
 *                         type: integer
 *                         example: 3
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         description: Failed to fetch teams
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *     deprecated: true
 */
router.get('/all', requireSuperAdmin, async (req, res) => {
  try {
    const showDeleted = req.query.deleted === 'true';
    
    // Get teams with filter for soft-deleted/active based on the parameter
    const [teams] = await db.query(`
      SELECT id, name, created_at, deleted_at
      FROM team 
      WHERE ${showDeleted ? 'deleted_at IS NOT NULL' : 'deleted_at IS NULL'}
      ORDER BY name ASC
    `);
    
    // For each team, get the counts separately to avoid duplication issues
    const teamsWithCounts = await Promise.all(teams.map(async (team) => {
      // Get user counts
      const [userCounts] = await db.query(`
        SELECT 
          COUNT(DISTINCT user_id) as user_count,
          SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_count,
          SUM(CASE WHEN role = 'collaborator' THEN 1 ELSE 0 END) as collaborator_count,
          SUM(CASE WHEN role = 'viewer' THEN 1 ELSE 0 END) as viewer_count
        FROM team_user
        WHERE team_id = ?
      `, [team.id]);
      
      // Get book count
      const [bookCounts] = await db.query(`
        SELECT COUNT(*) as book_count
        FROM book
        WHERE team_id = ? AND deleted_at IS NULL
      `, [team.id]);
      
      return {
        ...team,
        user_count: userCounts[0].user_count || 0,
        admin_count: userCounts[0].admin_count || 0,
        collaborator_count: userCounts[0].collaborator_count || 0,
        viewer_count: userCounts[0].viewer_count || 0,
        book_count: bookCounts[0].book_count || 0
      };
    }));

    res.status(200).json(teamsWithCounts);
  } catch (err) /* istanbul ignore next: unreachable in normal operation, only hit on db failure */ {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch all teams' });
  }
});

/**
 * @swagger
 * /teams/{id}:
 *   get:
 *     summary: Get details for a single team
 *     description: Retrieve details for a specific team by ID. Requires read access to the team or superadmin privileges.
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Team ID
 *     responses:
 *       200:
 *         description: Team details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Team'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         description: Failed to fetch team
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', async (req, res) => {
  try {
    // Superadmin can access any team, including deleted ones
    const includeDeleted = req.user.superadmin;
    const team = await getTeamById(req.params.id, includeDeleted);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Superadmin can access any team
    if (!req.user.superadmin) {
      const { allowed, message } = await canRead(req.params.id, req.user.id);
      if (!allowed) {
        return res.status(403).json({ error: message });
      }
    }

    res.status(200).json(team);
  } catch (err) /* istanbul ignore next: unreachable in normal operation, only hit on db failure */ {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

/**
 * @swagger
 * /teams:
 *   post:
 *     summary: Create a new team
 *     description: Create a new team with the authenticated user as admin. Any authenticated user can create teams.
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 example: "Family Budget Team"
 *                 description: Team name (required)
 *     responses:
 *       201:
 *         description: Team created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Team'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         description: Failed to create team
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', async (req, res) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Team name is required' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Create the team
    const [result] = await connection.query(`
      INSERT INTO team (name) VALUES (?)
    `, [name.trim()]);

    const teamId = result.insertId;

    // Add the creator as admin
    await connection.query(`
      INSERT INTO team_user (team_id, user_id, role) 
      VALUES (?, ?, 'admin')
    `, [teamId, req.user.id]);

    await connection.commit();

    // Fetch the created team
    const team = await getTeamById(teamId);
    res.status(201).json(team);
  } catch (err) /* istanbul ignore next: unreachable in normal operation, only hit on db failure */{
    await connection.rollback();
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to create team' });
  } finally {
    connection.release();
  }
});

/**
 * @swagger
 * /teams/{id}:
 *   put:
 *     summary: Update a team
 *     description: Update team details. Requires admin access to the team or superadmin privileges.
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Team ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 example: "Updated Team Name"
 *                 description: New team name
 *     responses:
 *       200:
 *         description: Team updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Team'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         description: Failed to update team
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', async (req, res) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Team name is required' });
  }

  try {
    const includeDeleted = req.user.superadmin;
    // First check if the team exists
    const team = await getTeamById(req.params.id, includeDeleted); // Do not include deleted teams
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    if(!req.user.superadmin) {
      // Check if user is admin of the team or superadmin
      const { allowed, message } = await canAdmin(req.params.id, req.user.id);
      if (!allowed) {
        return res.status(403).json({ error: message });
      }
    }

    // If team is deleted, not allow editing.
    if(team.deleted_at) {
      return res.status(403).json({ error: 'Cannot update deleted team' });
    }

    // Update the team
    await db.query(`
      UPDATE team SET name = ? WHERE id = ?
    `, [name.trim(), req.params.id]);

    // Fetch updated team
    const updatedTeam = await getTeamById(req.params.id);
    res.status(200).json(updatedTeam);
  } catch (err) /* istanbul ignore next: unreachable in normal operation, only hit on db failure */{
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to update team' });
  }
});

/**
 * @swagger
 * /teams/{id}/users:
 *   post:
 *     summary: Add a user to a team
 *     description: Add a user to a team with a specified role. Requires admin access to the team or superadmin privileges.
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Team ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - role
 *             properties:
 *               userId:
 *                 type: integer
 *                 example: 123
 *                 description: ID of the user to add to the team
 *               role:
 *                 type: string
 *                 enum: [admin, collaborator, viewer]
 *                 example: "collaborator"
 *                 description: Role to assign to the user
 *     responses:
 *       201:
 *         description: User added to team successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 allOf:
 *                   - $ref: '#/components/schemas/User'
 *                   - type: object
 *                     properties:
 *                       role:
 *                         type: string
 *                         enum: [admin, collaborator, viewer]
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         description: User already in team
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to add user to team
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:id/users', async (req, res) => {
  const { userId, role } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  if (!role || !['admin', 'collaborator', 'viewer'].includes(role)) {
    return res.status(400).json({ error: 'Valid role is required (admin, collaborator, or viewer)' });
  }

  try {
    // First check if the team exists
    const team = await getTeamById(req.params.id, true); // will not return deleted teams
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check admin permission (or is superadmin)
    if (!req.user.superadmin) {
      const { allowed, message } = await canAdmin(req.params.id, req.user.id);
      if (!allowed) {
        return res.status(403).json({ error: message });
      }
    }

    // if team is deleted, not allow adding users.
    if(team.deleted_at) {
      return res.status(403).json({ error: 'Cannot add users to a deleted team' });
    }

    // Check if user exists
    const [users] = await db.query('SELECT id FROM user WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is already in team
    const [existing] = await db.query(`
      SELECT 1 FROM team_user 
      WHERE team_id = ? AND user_id = ?
    `, [req.params.id, userId]);

    if (existing.length > 0) {
      return res.status(409).json({ error: 'User already in team' });
    }

    // Add user to team with specified role
    await db.query(`
      INSERT INTO team_user (team_id, user_id, role) 
      VALUES (?, ?, ?)
    `, [req.params.id, userId, role]);

    const updatedUsers = await getTeamUsers(req.params.id);
    res.status(201).json(updatedUsers);
  } catch (err) /* istanbul ignore next: unreachable in normal operation, only hit on db failure */{
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to add user to team' });
  }
});

/**
 * @swagger
 * /teams/{id}/users/add-by-username:
 *   post:
 *     summary: Add a user to a team by username
 *     description: Add a user to a team by their username with a specified role. Requires admin access to the team or superadmin privileges.
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Team ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - role
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 1
 *                 example: "john_doe"
 *                 description: Username of the user to add to the team
 *               role:
 *                 type: string
 *                 enum: [admin, collaborator, viewer]
 *                 example: "collaborator"
 *                 description: Role to assign to the user
 *     responses:
 *       201:
 *         description: User added to team successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 allOf:
 *                   - $ref: '#/components/schemas/User'
 *                   - type: object
 *                     properties:
 *                       role:
 *                         type: string
 *                         enum: [admin, collaborator, viewer]
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: User not found or team not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: User already in team
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to add user to team
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:id/users/add-by-username', async (req, res) => {
  const { username, role } = req.body;

  if (!username || !username.trim()) {
    return res.status(400).json({ error: 'Username is required' });
  }

  if (!role || !['admin', 'collaborator', 'viewer'].includes(role)) {
    return res.status(400).json({ error: 'Valid role is required (admin, collaborator, or viewer)' });
  }

  try {
    // First check if the team exists
    const team = await getTeamById(req.params.id, true);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // if team is deleted, not allow adding users.
    if(team.deleted_at) {
      return res.status(403).json({ error: 'Cannot add users to a deleted team' });
    }

    // Check admin permission (or is superadmin)
    if (!req.user.superadmin) {
      const { allowed, message } = await canAdmin(req.params.id, req.user.id);
      if (!allowed) {
        return res.status(403).json({ error: message });
      }
    }

    // Check if user exists by username
    const [users] = await db.query('SELECT id FROM user WHERE username = ? AND active = 1', [username.trim()]);
    if (users.length === 0) {
      return res.status(404).json({ error: `User '${username}' not found or is inactive` });
    }

    const userId = users[0].id;

    // Check if user is already in team
    const [existing] = await db.query(`
      SELECT 1 FROM team_user 
      WHERE team_id = ? AND user_id = ?
    `, [req.params.id, userId]);

    if (existing.length > 0) {
      return res.status(409).json({ error: `User '${username}' is already a member of this team` });
    }

    // Add user to team with specified role
    await db.query(`
      INSERT INTO team_user (team_id, user_id, role) 
      VALUES (?, ?, ?)
    `, [req.params.id, userId, role]);

    const updatedUsers = await getTeamUsers(req.params.id);
    res.status(201).json(updatedUsers);
  } catch (err) /* istanbul ignore next: unreachable in normal operation, only hit on db failure */ {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to add user to team' });
  }
});

/**
 * @swagger
 * /teams/{id}/users/{userId}:
 *   delete:
 *     summary: Remove a user from a team
 *     description: Remove a user from a team. Prevents removing the last admin unless performed by superadmin. Requires admin access to the team or superadmin privileges.
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Team ID
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID to remove from the team
 *     responses:
 *       204:
 *         description: User removed from team successfully (no content)
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         description: Cannot remove the last admin from the team
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to remove user from team
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id/users/:userId', async (req, res) => {
  try {
    // First check if team exists
    const team = await getTeamById(req.params.id, true); // will not return deleted teams
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // if team is deleted, not allow deleting users.
    if(team.deleted_at) {
      return res.status(403).json({ error: 'Cannot delete users of a deleted team' });
    }

    // Then check admin permission (or is superadmin)
    if (!req.user.superadmin) {
      const { allowed, message } = await canAdmin(req.params.id, req.user.id);
      if (!allowed) {
        return res.status(403).json({ error: message });
      }
    }

    // Check if user exists in team first
    const [existingUser] = await db.query(`
      SELECT role FROM team_user 
      WHERE team_id = ? AND user_id = ?
    `, [req.params.id, req.params.userId]);

    if (existingUser.length === 0) {
      return res.status(404).json({ error: 'User not found in team' });
    }

    // Prevent removing the last admin (unless user is superadmin)
    if (existingUser[0].role === 'admin' && !req.user.superadmin) {
      const [adminCount] = await db.query(`
        SELECT COUNT(*) as count FROM team_user 
        WHERE team_id = ? AND role = 'admin'
      `, [req.params.id]);

      if (adminCount[0].count === 1) {
        return res.status(409).json({ error: 'Cannot remove the last admin from the team' });
      }
    }

    // Remove user from team
    await db.query(`
      DELETE FROM team_user 
      WHERE team_id = ? AND user_id = ?
    `, [req.params.id, req.params.userId]);

    res.status(204).send();
  } catch (err) /* istanbul ignore next: unreachable in normal operation, only hit on db failure */{
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to remove user from team' });
  }
});

/**
 * @swagger
 * /teams/{id}/users/{userId}:
 *   put:
 *     summary: Update a user's role in a team
 *     description: Update a user's role within a team. Prevents removing the last admin unless performed by superadmin. Requires admin access to the team or superadmin privileges.
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Team ID
 *       - in: path
 *         name: userId
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
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [admin, collaborator, viewer]
 *                 example: "collaborator"
 *                 description: New role to assign to the user
 *     responses:
 *       200:
 *         description: User role updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 allOf:
 *                   - $ref: '#/components/schemas/User'
 *                   - type: object
 *                     properties:
 *                       role:
 *                         type: string
 *                         enum: [admin, collaborator, viewer]
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         description: Cannot remove the last admin from the team
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to update user role
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id/users/:userId', async (req, res) => {
  const { role } = req.body;

  if (!role || !['admin', 'collaborator', 'viewer'].includes(role)) {
    return res.status(400).json({ error: 'Valid role is required (admin, collaborator, or viewer)' });
  }

  try {
    // First check if the team exists
    const team = await getTeamById(req.params.id, true); // will not return deleted teams
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // if team is deleted, not allow updating users.
    if(team.deleted_at) {
      return res.status(403).json({ error: 'Cannot update users roles of a deleted team' });
    }

    // Then check if user has admin access (or is superadmin)
    if (!req.user.superadmin) {
      const { allowed, message } = await canAdmin(req.params.id, req.user.id);
      if (!allowed) {
        return res.status(403).json({ error: message });
      }
    }

    // Prevent removing the last admin (unless user is superadmin)
    if (role !== 'admin' && !req.user.superadmin) {
      const [adminCount] = await db.query(`
        SELECT COUNT(*) as count 
        FROM team_user 
        WHERE team_id = ? AND role = 'admin'
      `, [req.params.id]);

      const [currentRole] = await db.query(`
        SELECT role 
        FROM team_user 
        WHERE team_id = ? AND user_id = ?
      `, [req.params.id, req.params.userId]);

      if (adminCount[0].count === 1 && currentRole[0]?.role === 'admin') {
        return res.status(409).json({ error: 'Cannot remove the last admin from the team' });
      }
    }

    // Update user's role
    const [result] = await db.query(`
      UPDATE team_user 
      SET role = ? 
      WHERE team_id = ? AND user_id = ?
    `, [role, req.params.id, req.params.userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found in team' });
    }

    const updatedUsers = await getTeamUsers(req.params.id);
    res.status(200).json(updatedUsers);
  } catch (err) /* istanbul ignore next: unreachable in normal operation, only hit on db failure */ {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

/**
 * @swagger
 * /teams/{id}/users:
 *   get:
 *     summary: List all users in a team
 *     description: Retrieve all users who are members of a specific team, including their roles. Requires read access to the team or superadmin privileges.
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Team ID
 *     responses:
 *       200:
 *         description: List of team users with their roles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 allOf:
 *                   - $ref: '#/components/schemas/User'
 *                   - type: object
 *                     properties:
 *                       role:
 *                         type: string
 *                         enum: [admin, collaborator, viewer]
 *                         description: User's role in the team
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         description: Failed to fetch team users
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id/users', async (req, res) => {
  try {
    // Superadmin can access any team, including deleted ones
    const includeDeleted = req.user.superadmin;
    const team = await getTeamById(req.params.id, includeDeleted);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    if (!req.user.superadmin) {
      // Check if user has read access to this team
      const { allowed, message } = await canRead(req.params.id, req.user.id);
      if (!allowed) {
        return res.status(403).json({ error: message });
      }
    }

    const users = await getTeamUsers(req.params.id, includeDeleted);
    res.status(200).json(users);
  } catch (err) /* istanbul ignore next: unreachable in normal operation, only hit on db failure */{
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch team users' });
  }
});

/**
 * @swagger
 * /teams/{id}/books:
 *   get:
 *     summary: List all books for a specific team
 *     description: Retrieve all books belonging to a specific team. Requires read access to the team.
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Team ID
 *     responses:
 *       200:
 *         description: List of books for the team
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 allOf:
 *                   - $ref: '#/components/schemas/Book'
 *                   - type: object
 *                     properties:
 *                       team_name:
 *                         type: string
 *                         example: "Family Budget Team"
 *                         description: Name of the team that owns the book
 *                       role:
 *                         type: string
 *                         enum: [admin, collaborator, viewer]
 *                         description: User's role in the team
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         description: Failed to fetch books
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id/books', async (req, res) => {
  try {
    // First check if the team exists
    const team = await getTeamById(req.params.id);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check if user has read access to this team
    const { allowed, message } = await canRead(req.params.id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    // Get user's role in this team
    const userRole = await getUserRole(req.params.id, req.user.id);

    const [books] = await db.query(`
      SELECT b.*, t.name as team_name
      FROM book b
      INNER JOIN team t ON b.team_id = t.id
      WHERE b.team_id = ? AND b.deleted_at IS NULL AND t.deleted_at IS NULL
      ORDER BY b.name ASC
    `, [req.params.id]);

    // Add role to each book for consistency with previous API
    const booksWithRole = books.map(book => ({
      ...book,
      role: userRole
    }));

    res.status(200).json(booksWithRole);
  } catch (err) /* istanbul ignore next: unreachable in normal operation, only hit on db failure */ {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

/**
 * @swagger
 * /teams/{id}:
 *   delete:
 *     summary: Soft-delete a team
 *     description: Mark a team as deleted (soft delete). The team can be restored later. Requires admin access to the team.
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Team ID
 *     responses:
 *       204:
 *         description: Team soft-deleted successfully (no content)
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         description: Failed to delete team
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', async (req, res) => {
  try {
    const includeDeleted = req.user.superadmin; // Superadmins can see deleted teams
    // First check if the team exists and is not already deleted
    const team = await getTeamById(req.params.id, includeDeleted);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // Check permissions (only team admins and superadmins can soft-delete their team)
    if (!req.user.superadmin) {
      const { allowed, message } = await canAdmin(req.params.id, req.user.id);
      if (!allowed) {
        return res.status(403).json({ error: message });
      }
    }

    // Soft-delete the team
    await db.query(`
      UPDATE team SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?
    `, [req.params.id]);

    res.status(204).send();
  } catch (err) /* istanbul ignore next: unreachable in normal operation, only hit on db failure */ {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to delete team' });
  }
});

/**
 * @swagger
 * /teams/{id}/restore:
 *   post:
 *     summary: Restore a soft-deleted team
 *     description: Restore a previously soft-deleted team to active status. Superadmin only.
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Team ID
 *     responses:
 *       200:
 *         description: Team restored successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Team'
 *       400:
 *         description: Team is not deleted
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
 *         description: Failed to restore team
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:id/restore', requireSuperAdmin, async (req, res) => {
  try {
    // Check if the team exists and is soft-deleted
    const team = await getTeamById(req.params.id, true); // Include deleted teams
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    if (!team.deleted_at) {
      return res.status(400).json({ error: 'Team is not deleted' });
    }

    // Restore the team
    await db.query(`
      UPDATE team SET deleted_at = NULL WHERE id = ?
    `, [req.params.id]);

    // Fetch the restored team
    const restoredTeam = await getTeamById(req.params.id);
    res.status(200).json(restoredTeam);
  } catch (err) /* istanbul ignore next: unreachable in normal operation, only hit on db failure */ {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to restore team' });
  }
});

/**
 * @swagger
 * /teams/{id}/permanent:
 *   delete:
 *     summary: Permanently delete a team and all associated data
 *     description: |
 *       Permanently delete a team and all its associated data. This action cannot be undone.
 *       Superadmin only.
 *       
 *       **Cascade deletion includes:**
 *       - All transactions in team books
 *       - All accounts in team books
 *       - All categories in team books
 *       - All books belonging to the team
 *       - All team user relationships
 *       - The team itself
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Team ID
 *     responses:
 *       204:
 *         description: Team permanently deleted successfully (no content)
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         description: Failed to permanently delete team
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id/permanent', requireSuperAdmin, async (req, res) => {
  try {
    // Check if the team exists (including soft-deleted)
    const team = await getTeamById(req.params.id, true);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Delete all transactions for books in this team
      await connection.query(`
        DELETE t FROM transaction t
        INNER JOIN account a ON t.account_id = a.id
        INNER JOIN book b ON a.book_id = b.id
        WHERE b.team_id = ?
      `, [req.params.id]);

      // Delete all accounts for books in this team
      await connection.query(`
        DELETE a FROM account a
        INNER JOIN book b ON a.book_id = b.id
        WHERE b.team_id = ?
      `, [req.params.id]);

      // Delete all categories for books in this team
      await connection.query(`
        DELETE c FROM category c
        INNER JOIN book b ON c.book_id = b.id
        WHERE b.team_id = ?
      `, [req.params.id]);

      // Delete all books for this team
      await connection.query(`
        DELETE FROM book WHERE team_id = ?
      `, [req.params.id]);

      // Delete all team user relationships
      await connection.query(`
        DELETE FROM team_user WHERE team_id = ?
      `, [req.params.id]);

      // Finally, delete the team itself
      await connection.query(`
        DELETE FROM team WHERE id = ?
      `, [req.params.id]);

      await connection.commit();
      res.status(204).send();
    } catch (err) /* istanbul ignore next: unreachable in normal operation, only hit on db failure */{
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) /* istanbul ignore next: unreachable in normal operation, only hit on db failure */ {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to permanently delete team' });
  }
});

module.exports = router;
