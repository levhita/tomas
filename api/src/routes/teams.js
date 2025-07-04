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
  getTeamById
} = require('../utils/team');

/**
 * GET /teams
 * List all teams accessible to the current user
 * 
 * @permission Requires authentication, returns only teams the user is a member of
 * @returns {Array} List of teams the user has access to
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
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

/**
 * GET /teams/search
 * Search teams by name
 * 
 * @query {string} q - Search query
 * @query {number} limit - Maximum number of results (default: 20, max: 100)
 * @permission Super admin only
 * @returns {Array} List of teams matching the search criteria
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
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to search teams' });
  }
});

/**
 * GET /teams/all
 * Get all teams (admin only)
 * 
 * @permission Super admin only
 * @query {boolean} deleted - If 'true', return only soft-deleted teams (recycle bin). Default: 'false'
 * @returns {Array} List of all teams with user counts
 * @deprecated Use /teams/search instead for better performance
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
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch all teams' });
  }
});

/**
 * GET /teams/:id
 * Get details for a single team
 * 
 * @param {number} id - Team ID
 * @permission Read access to the team (admin, collaborator, viewer) or superadmin
 * @returns {Object} Team details
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
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

/**
 * POST /teams
 * Create a new team
 * 
 * @body {string} name - Required team name
 * @permission Any authenticated user
 * @returns {Object} Created team details
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
  } catch (err) {
    await connection.rollback();
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to create team' });
  } finally {
    connection.release();
  }
});

/**
 * PUT /teams/:id
 * Update a team
 * 
 * @param {number} id - Team ID
 * @body {string} name - Team name
 * @permission Admin access to the team or superadmin
 * @returns {Object} Updated team details
 */
router.put('/:id', async (req, res) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Team name is required' });
  }

  try {
    // First check if the team exists
    const team = await getTeamById(req.params.id);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check permissions (only admins can update team settings)
    if (!req.user.superadmin) {
      const { allowed, message } = await canAdmin(req.params.id, req.user.id);
      if (!allowed) {
        return res.status(403).json({ error: message });
      }
    }

    // Update the team
    await db.query(`
      UPDATE team SET name = ? WHERE id = ?
    `, [name.trim(), req.params.id]);

    // Fetch updated team
    const updatedTeam = await getTeamById(req.params.id);
    res.status(200).json(updatedTeam);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to update team' });
  }
});

/**
 * POST /teams/:id/users
 * Add a user to a team
 * 
 * @param {number} id - Team ID
 * @body {number} userId - User ID to add
 * @body {string} role - Role to assign (admin, collaborator, viewer)
 * @permission Admin access to the team or superadmin
 * @returns {Array} Updated list of team users
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
    // First check if the team exists (including deleted teams)
    const team = await getTeamById(req.params.id, true);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check if team is deleted - only allow superadmins to manage deleted teams
    if (team.deleted_at && !req.user.superadmin) {
      return res.status(403).json({ error: 'Cannot manage members of deleted teams. Please restore the team first.' });
    }

    // Then check if user has admin access (or is superadmin)
    if (!req.user.superadmin) {
      const { allowed, message } = await canAdmin(req.params.id, req.user.id);
      if (!allowed) {
        return res.status(403).json({ error: message });
      }
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
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to add user to team' });
  }
});

/**
 * DELETE /teams/:id/users/:userId
 * Remove a user from a team
 * 
 * @param {number} id - Team ID
 * @param {number} userId - User ID to remove
 * @permission Admin access to the team or superadmin
 * @returns {void}
 */
router.delete('/:id/users/:userId', async (req, res) => {
  try {
    // First check if team exists (including deleted teams)
    const team = await getTeamById(req.params.id, true);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check if team is deleted - only allow superadmins to manage deleted teams
    if (team.deleted_at && !req.user.superadmin) {
      return res.status(403).json({ error: 'Cannot manage members of deleted teams. Please restore the team first.' });
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
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to remove user from team' });
  }
});

/**
 * PUT /teams/:id/users/:userId
 * Update a user's role in a team
 * 
 * @param {number} id - Team ID
 * @param {number} userId - User ID to update
 * @body {string} role - New role to assign (admin, collaborator, viewer)
 * @permission Admin access to the team or superadmin
 * @returns {Array} Updated list of team users
 */
router.put('/:id/users/:userId', async (req, res) => {
  const { role } = req.body;

  if (!role || !['admin', 'collaborator', 'viewer'].includes(role)) {
    return res.status(400).json({ error: 'Valid role is required (admin, collaborator, or viewer)' });
  }

  try {
    // First check if the team exists (including deleted teams)
    const team = await getTeamById(req.params.id, true);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check if team is deleted - only allow superadmins to manage deleted teams
    if (team.deleted_at && !req.user.superadmin) {
      return res.status(403).json({ error: 'Cannot manage members of deleted teams. Please restore the team first.' });
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
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

/**
 * GET /teams/:id/users
 * List all users in a team
 * 
 * @param {number} id - Team ID
 * @permission Read access to the team (admin, collaborator, viewer) or superadmin
 * @returns {Array} List of team users
 */
router.get('/:id/users', async (req, res) => {
  try {
    // Superadmin can access any team, including deleted ones
    const includeDeleted = req.user.superadmin;
    const team = await getTeamById(req.params.id, includeDeleted);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Superadmin can access users of any team
    if (!req.user.superadmin) {
      const { allowed, message } = await canRead(req.params.id, req.user.id);
      if (!allowed) {
        return res.status(403).json({ error: message });
      }
    }

    const users = await getTeamUsers(req.params.id, includeDeleted);
    res.status(200).json(users);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch team users' });
  }
});

/**
 * DELETE /teams/:id
 * Soft-delete a team
 * 
 * @param {number} id - Team ID
 * @permission Admin access to the team
 * @returns {void}
 */
router.delete('/:id', async (req, res) => {
  try {
    // First check if the team exists and is not already deleted
    const team = await getTeamById(req.params.id);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check permissions (only team admins can soft-delete their team)
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
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to delete team' });
  }
});

/**
 * POST /teams/:id/restore
 * Restore a soft-deleted team
 * 
 * @param {number} id - Team ID
 * @permission Super admin only
 * @returns {Object} Restored team details
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
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to restore team' });
  }
});

/**
 * DELETE /teams/:id/permanent
 * Permanently delete a team and all associated data
 * 
 * @param {number} id - Team ID
 * @permission Super admin only
 * @returns {void}
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
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to permanently delete team' });
  }
});

module.exports = router;
