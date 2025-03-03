const express = require('express');
const router = express.Router();
const db = require('../db');

// Helper functions
async function checkWorkspaceAccess(workspaceId, userId) {
  const [access] = await db.query(`
    SELECT 1 FROM workspace_user 
    WHERE workspace_id = ? AND user_id = ?
  `, [workspaceId, userId]);

  return access.length > 0;
}

async function getWorkspaceUsers(workspaceId) {
  const [users] = await db.query(`
    SELECT u.id, u.username, u.created_at
    FROM user u
    INNER JOIN workspace_user wu ON u.id = wu.user_id
    WHERE wu.workspace_id = ?
    ORDER BY u.username ASC
  `, [workspaceId]);
  return users;
}

// Update the getWorkspaceById helper
async function getWorkspaceById(workspaceId) {
  const [workspaces] = await db.query(
    'SELECT * FROM workspace WHERE id = ? AND deleted_at IS NULL',
    [workspaceId]
  );
  return workspaces[0];
}

async function getWorkspaceWithUsers(workspaceId) {
  const workspace = await getWorkspaceById(workspaceId);
  if (!workspace) return null;

  const users = await getWorkspaceUsers(workspaceId);
  return { ...workspace, users };
}

// Routes
// Update the GET / route to exclude deleted workspaces
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

router.get('/:id', async (req, res) => {
  try {
    const hasAccess = await checkWorkspaceAccess(req.params.id, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const workspace = await getWorkspaceWithUsers(req.params.id);
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
      connection.release();

      const workspace = await getWorkspaceWithUsers(result.insertId);

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

router.put('/:id', async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const hasAccess = await checkWorkspaceAccess(req.params.id, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [result] = await db.query(`
      UPDATE workspace SET name = ?, description = ? WHERE id = ?
    `, [name, description, req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const workspace = await getWorkspaceWithUsers(req.params.id);
    res.status(200).json(workspace);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to update workspace' });
  }
});

// Update the DELETE route to use soft delete
router.delete('/:id', async (req, res) => {
  try {
    const hasAccess = await checkWorkspaceAccess(req.params.id, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [result] = await db.query(`
      UPDATE workspace 
      SET deleted_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND deleted_at IS NULL
    `, [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    res.status(204).send();
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to delete workspace' });
  }
});

// Add new route to restore deleted workspace
router.post('/:id/restore', async (req, res) => {
  try {
    const hasAccess = await checkWorkspaceAccess(req.params.id, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [result] = await db.query(`
      UPDATE workspace 
      SET deleted_at = NULL 
      WHERE id = ? AND deleted_at IS NOT NULL
    `, [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Workspace not found or already restored' });
    }

    const workspace = await getWorkspaceWithUsers(req.params.id);
    res.status(200).json(workspace);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to restore workspace' });
  }
});

// Optional: Add route to permanently delete workspace
router.delete('/:id/permanent', async (req, res) => {
  try {
    const hasAccess = await checkWorkspaceAccess(req.params.id, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
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
    const hasAccess = await checkWorkspaceAccess(req.params.id, req.user.id);
    if (!hasAccess) {
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


    const updatedUsers = await getWorkspaceUsers(req.params.id);
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
    const hasAccess = await checkWorkspaceAccess(req.params.id, req.user.id);
    if (!hasAccess) {
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
    const hasAccess = await checkWorkspaceAccess(req.params.id, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updatedUsers = await getWorkspaceUsers(req.params.id);
    res.status(200).json(updatedUsers);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch workspace users' });
  }
});

module.exports = router;