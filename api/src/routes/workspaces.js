const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all workspaces for current user
router.get('/', async (req, res) => {
  try {
    const [workspaces] = await db.query(`
      SELECT w.* 
      FROM workspace w
      INNER JOIN workspace_user wu ON w.id = wu.workspace_id
      WHERE wu.user_id = ?
      ORDER BY w.name ASC
    `, [req.user.id]);

    res.status(200).json(workspaces);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch workspaces' });
  }
});

// Get single workspace
router.get('/:id', async (req, res) => {
  try {
    const [workspaces] = await db.query(`
      SELECT w.*, GROUP_CONCAT(u.username) as users
      FROM workspace w
      INNER JOIN workspace_user wu ON w.id = wu.workspace_id
      INNER JOIN user u ON wu.user_id = u.id
      WHERE w.id = ? AND EXISTS (
        SELECT 1 FROM workspace_user 
        WHERE workspace_id = w.id AND user_id = ?
      )
      GROUP BY w.id
    `, [req.params.id, req.user.id]);

    if (workspaces.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    res.status(200).json(workspaces[0]);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch workspace' });
  }
});

// Create new workspace
router.post('/', async (req, res) => {
  const { name, description = null } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      const [result] = await connection.query(
        'INSERT INTO workspace (name, description) VALUES (?, ?)',
        [name, description]
      );

      await connection.query(
        'INSERT INTO workspace_user (workspace_id, user_id) VALUES (?, ?)',
        [result.insertId, req.user.id]
      );

      await connection.commit();

      const [workspaces] = await connection.query(
        'SELECT * FROM workspace WHERE id = ?',
        [result.insertId]
      );

      connection.release();
      res.status(201).json(workspaces[0]);
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

// Update workspace
router.put('/:id', async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const [result] = await db.query(`
      UPDATE workspace w
      SET name = ?, description = ?
      WHERE id = ? AND EXISTS (
        SELECT 1 FROM workspace_user 
        WHERE workspace_id = w.id AND user_id = ?
      )
    `, [name, description, req.params.id, req.user.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const [workspaces] = await db.query(
      'SELECT * FROM workspace WHERE id = ?',
      [req.params.id]
    );

    res.status(200).json(workspaces[0]);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to update workspace' });
  }
});

// Delete workspace
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query(`
      DELETE w FROM workspace w
      WHERE w.id = ? AND EXISTS (
        SELECT 1 FROM workspace_user 
        WHERE workspace_id = w.id AND user_id = ?
      )
    `, [req.params.id, req.user.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    res.status(204).send();
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to delete workspace' });
  }
});

// Add user to workspace
router.post('/:id/users', async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    // Check if user exists
    const [users] = await db.query('SELECT id FROM user WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if requester has access to workspace
    const [workspaces] = await db.query(`
      SELECT 1 FROM workspace_user 
      WHERE workspace_id = ? AND user_id = ?
    `, [req.params.id, req.user.id]);

    if (workspaces.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if user is already in workspace
    const [existing] = await db.query(`
      SELECT 1 FROM workspace_user 
      WHERE workspace_id = ? AND user_id = ?
    `, [req.params.id, userId]);

    if (existing.length > 0) {
      return res.status(409).json({ error: 'User already in workspace' });
    }

    // Add user to workspace
    await db.query(`
      INSERT INTO workspace_user (workspace_id, user_id) 
      VALUES (?, ?)
    `, [req.params.id, userId]);

    // Get updated users list
    const [updatedUsers] = await db.query(`
      SELECT u.id, u.username, u.created_at
      FROM user u
      INNER JOIN workspace_user wu ON u.id = wu.user_id
      WHERE wu.workspace_id = ?
      ORDER BY u.username ASC
    `, [req.params.id]);

    res.status(201).json(updatedUsers);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to add user to workspace' });
  }
});

// Remove user from workspace
router.delete('/:id/users/:userId', async (req, res) => {
  try {
    // Check if requester has access to workspace
    const [workspaces] = await db.query(`
      SELECT 1 FROM workspace_user 
      WHERE workspace_id = ? AND user_id = ?
    `, [req.params.id, req.user.id]);

    if (workspaces.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
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

// Get workspace users
router.get('/:id/users', async (req, res) => {
  try {
    // Check if requester has access to workspace
    const [access] = await db.query(`
      SELECT 1 FROM workspace_user 
      WHERE workspace_id = ? AND user_id = ?
    `, [req.params.id, req.user.id]);

    if (access.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get users
    const [users] = await db.query(`
      SELECT u.id, u.username, u.created_at
      FROM user u
      INNER JOIN workspace_user wu ON u.id = wu.user_id
      WHERE wu.workspace_id = ?
      ORDER BY u.username ASC
    `, [req.params.id]);

    res.status(200).json(users);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch workspace users' });
  }
});

module.exports = router;