/**
 * Workspaces API Router
 * Handles all workspace-related operations including:
 * - Managing workspaces (create, read, update, delete)
 * - Workspace soft deletion and r * Create a new workspace
 * 
 * @body {string} name - Required workspace name
 * @body {string} note - Optional workspace note
 * @body {string} currency_symbol - Currency symbol (default: '$')ation
 * - User access management for workspaces
 * - Role assignment within workspaces
 * 
 * Permission model:
 * - READ operations: Any workspace member (admin, collaborator, viewer)
 * - WRITE operations: Workspace editors (admin, collaborator)
 * - ADMIN operations: Workspace admins only
 * 
 * Workspace roles:
 * - admin: Full control including user management and workspace deletion
 * - collaborator: Can edit workspace content but not manage users
 * - viewer: Read-only access to workspace content
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireSuperAdmin } = require('../middleware/auth');
const {
  canAdmin,
  canWrite,
  canRead,
  getWorkspaceUsers,
  getWorkspaceById,
  getWorkspaceByIdIncludingDeleted
} = require('../utils/workspace');

/**
 * GET /workspaces
 * List all workspaces accessible to the current user
 * 
 * @permission Requires authentication, returns only workspaces the user is a member of
 * @returns {Array} List of workspaces the user has access to
 */
router.get('/', async (req, res) => {
  try {
    const [workspaces] = await db.query(`
      SELECT w.*, wu.role 
      FROM workspace w
      INNER JOIN workspace_user wu ON w.id = wu.workspace_id
      WHERE wu.user_id = ? AND w.deleted_at IS NULL
      ORDER BY w.name ASC
    `, [req.user.id]);

    res.status(200).json(workspaces);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch workspaces' });
  }
});

/**
 * GET /workspaces/search
 * Search workspaces by name or ID (admin only)
 * 
 * @query {string} q - Search query (workspace name or ID)
 * @query {number} limit - Maximum results to return (default: 10, max: 50)
 * @permission Super admin only
 * @returns {Array} List of matching workspaces
 */
router.get('/search', requireSuperAdmin, async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const searchTerm = q.trim();
    const resultLimit = Math.min(parseInt(limit) || 10, 50); // Cap at 50 results

    // Check if search term is a number (ID search)
    const isNumericSearch = /^\d+$/.test(searchTerm);

    let query;
    let params;

    if (isNumericSearch) {
      // Search by exact ID or partial ID
      query = `
        SELECT id, name, note, currency_symbol, created_at
        FROM workspace 
        WHERE deleted_at IS NULL 
        AND (id = ? OR CAST(id AS CHAR) LIKE ?)
        ORDER BY 
          CASE WHEN id = ? THEN 0 ELSE 1 END,
          name ASC
        LIMIT ?
      `;
      params = [parseInt(searchTerm), `${searchTerm}%`, parseInt(searchTerm), resultLimit];
    } else {
      // Search by workspace name (partial match, case-insensitive)
      query = `
        SELECT id, name, note, currency_symbol, created_at
        FROM workspace 
        WHERE deleted_at IS NULL 
        AND name LIKE ?
        ORDER BY 
          CASE WHEN name = ? THEN 0 ELSE 1 END,
          LENGTH(name) ASC,
          name ASC
        LIMIT ?
      `;
      params = [`%${searchTerm}%`, searchTerm, resultLimit];
    }

    const [workspaces] = await db.query(query, params);
    res.status(200).json(workspaces);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to search workspaces' });
  }
});

/**
 * GET /workspaces/all
 * Get all workspaces (admin only)
 * 
 * @permission Super admin only
 * @returns {Array} List of all workspaces
 * @deprecated Use /workspaces/search instead for better performance
 */
router.get('/all', requireSuperAdmin, async (req, res) => {
  try {
    const [workspaces] = await db.query(`
      SELECT id, name, note, currency_symbol, created_at
      FROM workspace 
      WHERE deleted_at IS NULL
      ORDER BY name ASC
    `);

    res.status(200).json(workspaces);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch all workspaces' });
  }
});

/**
 * GET /workspaces/:id
 * Get details for a single workspace
 * 
 * @param {number} id - Workspace ID
 * @permission Read access to the workspace (admin, collaborator, viewer)
 * @returns {Object} Workspace details
 */
router.get('/:id', async (req, res) => {
  try {
    // First check if the workspace exists
    const workspace = await getWorkspaceById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Then check if user has read access
    const { allowed, message } = await canRead(req.params.id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    res.status(200).json(workspace);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch workspace' });
  }
});

/**
 * POST /workspaces
 * Create a new workspace
 * 
 * @body {string} name - Required workspace name
 * @body {string} note - Optional workspace note
 * @body {string} currency_symbol - Currency symbol, defaults to '$'
 * @body {string} week_start - First day of the week, defaults to 'monday'
 * @permission Any authenticated user can create a workspace
 * @returns {Object} Newly created workspace
 * 
 * Note: Creating user is automatically assigned the admin role in the new workspace
 */
router.post('/', async (req, res) => {
  const { name, note = null, currency_symbol = '$', week_start = 'monday' } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    // Use a transaction to ensure workspace and user association are created together
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Create the workspace
      const [result] = await connection.query(
        'INSERT INTO workspace (name, note, currency_symbol, week_start) VALUES (?, ?, ?, ?)',
        [name, note, currency_symbol, week_start]
      );

      // Add current user as admin of the workspace
      await connection.query(
        'INSERT INTO workspace_user (workspace_id, user_id, role) VALUES (?, ?, ?)',
        [result.insertId, req.user.id, 'admin']
      );

      await connection.commit();
      connection.release();

      const workspace = await getWorkspaceById(result.insertId);
      res.status(201).json(workspace);
    } catch (err) {
      await connection.rollback();
      connection.release();
      throw err;
    }
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to create workspace' });
  }
});

/**
 * PUT /workspaces/:id
 * Update workspace details
 * 
 * @param {number} id - Workspace ID
 * @body {string} name - Required workspace name
 * @body {string} note - Optional workspace note
 * @body {string} currency_symbol - Currency symbol
 * @body {string} week_start - First day of the week
 * @permission Admin access to the workspace (admin only)
 * @returns {Object} Updated workspace details
 */
router.put('/:id', async (req, res) => {
  const { name, note, currency_symbol, week_start } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    // First check if the workspace exists
    const existingWorkspace = await getWorkspaceById(req.params.id);
    if (!existingWorkspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Then check if user has admin access
    const { allowed, message } = await canAdmin(req.params.id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    const currencySymbol = currency_symbol !== undefined ? currency_symbol : existingWorkspace.currency_symbol;
    const weekStart = week_start !== undefined ? week_start : existingWorkspace.week_start;

    const [result] = await db.query(`
      UPDATE workspace        SET name = ?, 
          note = ?, 
          currency_symbol = ?, 
          week_start = ?
        WHERE id = ?
    `, [name, note, currencySymbol, weekStart, req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const workspace = await getWorkspaceById(req.params.id);
    res.status(200).json(workspace);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to update workspace' });
  }
});

/**
 * DELETE /workspaces/:id
 * Soft delete a workspace
 * 
 * @param {number} id - Workspace ID
 * @permission Admin access to the workspace
 * @returns {void}
 */
router.delete('/:id', async (req, res) => {
  try {
    // First check if the workspace exists
    const workspace = await getWorkspaceById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Then check if user has admin access
    const { allowed, message } = await canAdmin(req.params.id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    const [result] = await db.query(`
      UPDATE workspace 
      SET deleted_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND deleted_at IS NULL
    `, [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Workspace not found or already deleted' });
    }

    res.status(200).json({ message: 'Workspace deleted successfully' });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to delete workspace' });
  }
});

/**
 * POST /workspaces/:id/restore
 * Restore a soft-deleted workspace
 * 
 * @param {number} id - Workspace ID
 * @permission Superadmin only
 * @returns {Object} Restored workspace details
 */
router.post('/:id/restore', requireSuperAdmin, async (req, res) => {
  try {
    // First check if workspace exists (including soft-deleted ones)
    const workspace = await getWorkspaceByIdIncludingDeleted(req.params.id);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Check if workspace is already active
    if (!workspace.deleted_at) {
      return res.status(400).json({ error: 'Workspace is already active' });
    }

    const [result] = await db.query(`
      UPDATE workspace 
      SET deleted_at = NULL 
      WHERE id = ? AND deleted_at IS NOT NULL
    `, [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Workspace not found or already restored' });
    }

    const restoredWorkspace = await getWorkspaceById(req.params.id);
    res.status(200).json(restoredWorkspace);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to restore workspace' });
  }
});

/**
 * DELETE /workspaces/:id/permanent
 * Permanently delete a workspace and cascade delete all related data
 * 
 * @param {number} id - Workspace ID
 * @permission Superadmin only
 * @returns {void}
 * 
 * Note: This will cascade delete ALL related data including:
 * - All transactions in workspace accounts
 * - All account totals 
 * - All categories (including hierarchical categories)
 * - All accounts
 * - All workspace users
 * - The workspace itself
 */
router.delete('/:id/permanent', requireSuperAdmin, async (req, res) => {
  try {
    // First check if workspace exists (including soft-deleted ones)
    const workspace = await getWorkspaceByIdIncludingDeleted(req.params.id);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Check if workspace is soft-deleted (requirement for permanent deletion)
    if (!workspace.deleted_at) {
      return res.status(400).json({ error: 'Workspace must be soft-deleted before permanent deletion' });
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // CASCADE DELETE ALL RELATED DATA

      // 1. Delete transactions first (they reference accounts and categories)
      await connection.query(`
        DELETE t FROM transaction t 
        INNER JOIN account a ON t.account_id = a.id 
        WHERE a.workspace_id = ?
      `, [req.params.id]);

      // 2. Delete totals (they reference accounts)
      await connection.query(`
        DELETE t FROM total t 
        INNER JOIN account a ON t.account_id = a.id 
        WHERE a.workspace_id = ?
      `, [req.params.id]);

      // 3. Delete categories (handle self-references by deleting children first)
      // First, delete child categories (categories with parent_category_id)
      await connection.query(`
        DELETE FROM category 
        WHERE workspace_id = ? AND parent_category_id IS NOT NULL
      `, [req.params.id]);

      // Then delete parent categories
      await connection.query(`
        DELETE FROM category 
        WHERE workspace_id = ? AND parent_category_id IS NULL
      `, [req.params.id]);

      // 4. Delete accounts
      await connection.query(`
        DELETE FROM account WHERE workspace_id = ?
      `, [req.params.id]);

      // 5. Delete workspace users
      await connection.query(`
        DELETE FROM workspace_user WHERE workspace_id = ?
      `, [req.params.id]);

      // 6. Finally delete the workspace
      const [result] = await connection.query(`
        DELETE FROM workspace WHERE id = ?
      `, [req.params.id]);

      if (result.affectedRows === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({ error: 'Workspace not found' });
      }

      await connection.commit();
      connection.release();
      res.status(204).send();
    } catch (err) {
      await connection.rollback();
      connection.release();
      throw err;
    }
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to permanently delete workspace' });
  }
});

/**
 * POST /workspaces/:id/users
 * Add a user to a workspace
 * 
 * @param {number} id - Workspace ID
 * @body {number} userId - User ID to add
 * @body {string} role - Role to assign (admin, collaborator, viewer)
 * @permission Admin access to the workspace or superadmin
 * @returns {Array} Updated list of workspace users
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
    // First check if the workspace exists
    const workspace = await getWorkspaceById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
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

    // Check if user is already in workspace
    const [existing] = await db.query(`
      SELECT 1 FROM workspace_user 
      WHERE workspace_id = ? AND user_id = ?
    `, [req.params.id, userId]);

    if (existing.length > 0) {
      return res.status(409).json({ error: 'User already in workspace' });
    }

    // Add user to workspace with specified role
    await db.query(`
      INSERT INTO workspace_user (workspace_id, user_id, role) 
      VALUES (?, ?, ?)
    `, [req.params.id, userId, role]);

    const updatedUsers = await getWorkspaceUsers(req.params.id);
    res.status(201).json(updatedUsers);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to add user to workspace' });
  }
});

/**
 * DELETE /workspaces/:id/users/:userId
 * Remove a user from a workspace
 * 
 * @param {number} id - Workspace ID
 * @param {number} userId - User ID to remove
 * @permission Admin access to the workspace or superadmin
 * @returns {void}
 */
router.delete('/:id/users/:userId', async (req, res) => {
  try {
    // First check if workspace exists
    const workspace = await getWorkspaceById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Then check admin permission (or is superadmin)
    if (!req.user.superadmin) {
      const { allowed, message } = await canAdmin(req.params.id, req.user.id);
      if (!allowed) {
        return res.status(403).json({ error: message });
      }
    }

    // Check if user exists in workspace first
    const [existingUser] = await db.query(`
      SELECT role FROM workspace_user 
      WHERE workspace_id = ? AND user_id = ?
    `, [req.params.id, req.params.userId]);

    if (existingUser.length === 0) {
      return res.status(404).json({ error: 'User not found in workspace' });
    }

    // Prevent removing the last admin (unless user is superadmin)
    if (existingUser[0].role === 'admin' && !req.user.superadmin) {
      const [adminCount] = await db.query(`
        SELECT COUNT(*) as count FROM workspace_user 
        WHERE workspace_id = ? AND role = 'admin'
      `, [req.params.id]);

      if (adminCount[0].count === 1) {
        return res.status(409).json({ error: 'Cannot remove the last admin from the workspace' });
      }
    }

    // Remove user from workspace
    const [result] = await db.query(`
      DELETE FROM workspace_user 
      WHERE workspace_id = ? AND user_id = ?
    `, [req.params.id, req.params.userId]);

    res.status(204).send();
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to remove user from workspace' });
  }
});

/**
 * PUT /workspaces/:id/users/:userId
 * Update a user's role in a workspace
 * 
 * @param {number} id - Workspace ID
 * @param {number} userId - User ID to update
 * @body {string} role - New role to assign (admin, collaborator, viewer)
 * @permission Admin access to the workspace or superadmin
 * @returns {Array} Updated list of workspace users
 */
router.put('/:id/users/:userId', async (req, res) => {
  const { role } = req.body;

  if (!role || !['admin', 'collaborator', 'viewer'].includes(role)) {
    return res.status(400).json({ error: 'Valid role is required (admin, collaborator, or viewer)' });
  }

  try {
    // First check if the workspace exists
    const workspace = await getWorkspaceById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
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
        FROM workspace_user 
        WHERE workspace_id = ? AND role = 'admin'
      `, [req.params.id]);

      const [currentRole] = await db.query(`
        SELECT role 
        FROM workspace_user 
        WHERE workspace_id = ? AND user_id = ?
      `, [req.params.id, req.params.userId]);

      if (adminCount[0].count === 1 && currentRole[0]?.role === 'admin') {
        return res.status(409).json({ error: 'Cannot remove the last admin from the workspace' });
      }
    }

    // Update user's role
    const [result] = await db.query(`
      UPDATE workspace_user 
      SET role = ? 
      WHERE workspace_id = ? AND user_id = ?
    `, [role, req.params.id, req.params.userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found in workspace' });
    }

    const updatedUsers = await getWorkspaceUsers(req.params.id);
    res.status(200).json(updatedUsers);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

/**
 * GET /workspaces/:id/users
 * List all users in a workspace
 * 
 * @param {number} id - Workspace ID
 * @permission Read access to the workspace (admin, collaborator, viewer) or superadmin
 * @returns {Array} List of workspace users
 */
router.get('/:id/users', async (req, res) => {
  try {
    // First check if the workspace exists
    const workspace = await getWorkspaceById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Superadmin can access users of any workspace
    if (!req.user.superadmin) {
      const { allowed, message } = await canRead(req.params.id, req.user.id);
      if (!allowed) {
        return res.status(403).json({ error: message });
      }
    }

    const users = await getWorkspaceUsers(req.params.id);
    res.status(200).json(users);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch workspace users' });
  }
});

module.exports = router;