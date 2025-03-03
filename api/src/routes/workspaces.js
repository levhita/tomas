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

module.exports = router;