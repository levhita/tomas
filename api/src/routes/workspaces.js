const express = require('express');
const router = express.Router();
const db = require('../db');
const {
  canAdmin,
  canWrite,
  canRead,
  getWorkspaceUsers,
  getWorkspaceById
} = require('../utils/workspace');

// Get workspace list (only needs auth, no workspace-specific permission)
router.get('/', async (req, res) => {
  try {
    const [workspaces] = await db.query(`
      SELECT w.* 
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

// View single workspace (requires read permission)
router.get('/:id', async (req, res) => {
  try {
    const { allowed, message } = await canRead(req.params.id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    const workspace = await getWorkspaceById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    res.status(200).json(workspace);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch workspace' });
  }
});

// Create new workspace
router.post('/', async (req, res) => {
  const { name, description = null, currency_symbol = '$', week_start = 'monday' } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      const [result] = await connection.query(
        'INSERT INTO workspace (name, description, currency_symbol, week_start) VALUES (?, ?, ?, ?)',
        [name, description, currency_symbol, week_start]
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

// Update workspace (requires write permission)
router.put('/:id', async (req, res) => {
  const { name, description, currency_symbol, week_start } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const { allowed, message } = await canWrite(req.params.id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    // Get existing workspace to keep current values if not provided
    const existingWorkspace = await getWorkspaceById(req.params.id);
    if (!existingWorkspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const currencySymbol = currency_symbol !== undefined ? currency_symbol : existingWorkspace.currency_symbol;
    const weekStart = week_start !== undefined ? week_start : existingWorkspace.week_start;

    const [result] = await db.query(`
      UPDATE workspace 
      SET name = ?, 
          description = ?, 
          currency_symbol = ?, 
          week_start = ? 
      WHERE id = ?
    `, [name, description, currencySymbol, weekStart, req.params.id]);

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

// Delete workspace (requires admin permission)
router.delete('/:id', async (req, res) => {
  try {
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

    res.status(204).send();
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to delete workspace' });
  }
});

// Restore workspace (requires admin permission)
router.post('/:id/restore', async (req, res) => {
  try {
    const { allowed, message } = await canAdmin(req.params.id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    const [result] = await db.query(`
      UPDATE workspace 
      SET deleted_at = NULL 
      WHERE id = ? AND deleted_at IS NOT NULL
    `, [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Workspace not found or already restored' });
    }

    const workspace = await getWorkspaceById(req.params.id);
    res.status(200).json(workspace);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to restore workspace' });
  }
});

// Permanently delete workspace (requires admin permission)
router.delete('/:id/permanent', async (req, res) => {
  try {
    const { allowed, message } = await canAdmin(req.params.id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Delete workspace users first (foreign key constraint)
      await connection.query(
        'DELETE FROM workspace_user WHERE workspace_id = ?',
        [req.params.id]
      );

      // Then delete the workspace
      const [result] = await connection.query(
        'DELETE FROM workspace WHERE id = ?',
        [req.params.id]
      );

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

// Add user to workspace (requires admin permission)
router.post('/:id/users', async (req, res) => {
  const { userId, role } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  if (!role || !['admin', 'collaborator', 'viewer'].includes(role)) {
    return res.status(400).json({ error: 'Valid role is required (admin, collaborator, or viewer)' });
  }

  try {
    const { allowed, message } = await canAdmin(req.params.id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
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

// Remove user from workspace (requires admin permission)
router.delete('/:id/users/:userId', async (req, res) => {
  try {
    const { allowed, message } = await canAdmin(req.params.id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    // Prevent removing the last user
    const [userCount] = await db.query(`
      SELECT COUNT(*) as count FROM workspace_user 
      WHERE workspace_id = ?
    `, [req.params.id]);

    if (userCount[0].count === 1) {
      return res.status(400).json({ error: 'Cannot remove the last user from the workspace' });
    }

    // Remove user from workspace
    const [result] = await db.query(`
      DELETE FROM workspace_user 
      WHERE workspace_id = ? AND user_id = ?
    `, [req.params.id, req.params.userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found in workspace' });
    }

    res.status(204).send();
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to remove user from workspace' });
  }
});

// Update user role in workspace (requires admin permission)
router.put('/:id/users/:userId', async (req, res) => {
  const { role } = req.body;

  if (!role || !['admin', 'collaborator', 'viewer'].includes(role)) {
    return res.status(400).json({ error: 'Valid role is required (admin, collaborator, or viewer)' });
  }

  try {
    const { allowed, message } = await canAdmin(req.params.id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    // Prevent removing the last admin
    if (role !== 'admin') {
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
        return res.status(400).json({ error: 'Cannot remove the last admin from the workspace' });
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

// Get workspace users (requires read permission)
router.get('/:id/users', async (req, res) => {
  try {
    const { allowed, message } = await canRead(req.params.id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    const users = await getWorkspaceUsers(req.params.id);
    res.status(200).json(users);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch workspace users' });
  }
});

module.exports = router;