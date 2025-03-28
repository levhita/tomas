const express = require('express');
const router = express.Router();
const db = require('../db');
const { checkWorkspaceAccess } = require('../utils/workspace');

// Get all categories for a workspace
router.get('/', async (req, res) => {
  const workspaceId = req.query.workspace_id;

  if (!workspaceId) {
    return res.status(400).json({ error: 'workspace_id is required' });
  }

  try {
    // Verify user has access to the workspace
    const hasAccess = await checkWorkspaceAccess(workspaceId, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this workspace' });
    }

    const [categories] = await db.query(`
      SELECT * FROM category 
      WHERE workspace_id = ?
      ORDER BY name ASC
    `, [workspaceId]);

    res.status(200).json(categories);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get single category
router.get('/:id', async (req, res) => {
  try {
    const [categories] = await db.query(`
      SELECT * FROM category 
      WHERE id = ?
    `, [req.params.id]);

    if (categories.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check if user has access to the workspace this category belongs to
    const workspaceId = categories[0].workspace_id;
    const hasAccess = await checkWorkspaceAccess(workspaceId, req.user.id);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this category' });
    }

    res.status(200).json(categories[0]);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

// Create category
router.post('/', async (req, res) => {
  const { name, note = null, parent_category_id = null, workspace_id, type = 'expense' } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  if (!workspace_id) {
    return res.status(400).json({ error: 'workspace_id is required' });
  }

  try {
    // Verify user has access to the workspace
    const hasAccess = await checkWorkspaceAccess(workspace_id, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this workspace' });
    }

    // If parent category is specified, verify it belongs to the same workspace
    if (parent_category_id) {
      const [parentCategories] = await db.query(`
        SELECT workspace_id FROM category WHERE id = ?
      `, [parent_category_id]);

      if (parentCategories.length === 0) {
        return res.status(404).json({ error: 'Parent category not found' });
      }

      if (parentCategories[0].workspace_id !== parseInt(workspace_id)) {
        return res.status(400).json({ error: 'Parent category must belong to the same workspace' });
      }
    }

    const [result] = await db.query(`
      INSERT INTO category (name, note, type, parent_category_id, workspace_id)
      VALUES (?, ?, ?, ?, ?)
    `, [name, note, type, parent_category_id, workspace_id]);

    const [categories] = await db.query(`
      SELECT * FROM category 
      WHERE id = ?
    `, [result.insertId]);

    res.status(201).json(categories[0]);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update category
router.put('/:id', async (req, res) => {
  const { name, note, type, parent_category_id } = req.body;

  try {
    // First fetch the category to check workspace access
    const [categories] = await db.query(`
      SELECT * FROM category WHERE id = ?
    `, [req.params.id]);

    if (categories.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const workspaceId = categories[0].workspace_id;

    // Verify user has access to the workspace
    const hasAccess = await checkWorkspaceAccess(workspaceId, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this category' });
    }

    // If parent category is being updated, verify it belongs to the same workspace
    if (parent_category_id) {
      const [parentCategories] = await db.query(`
        SELECT workspace_id FROM category WHERE id = ?
      `, [parent_category_id]);

      if (parentCategories.length === 0) {
        return res.status(404).json({ error: 'Parent category not found' });
      }

      if (parentCategories[0].workspace_id !== workspaceId) {
        return res.status(400).json({ error: 'Parent category must belong to the same workspace' });
      }
    }

    const [result] = await db.query(`
      UPDATE category
      SET name = ?,
          note = ?,
          type = ?,
          parent_category_id = ?
      WHERE id = ?
    `, [name, note, type, parent_category_id, req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const [updatedCategories] = await db.query(`
      SELECT * FROM category 
      WHERE id = ?
    `, [req.params.id]);

    res.status(200).json(updatedCategories[0]);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete category
router.delete('/:id', async (req, res) => {
  try {
    // First fetch the category to check workspace access
    const [categories] = await db.query(`
      SELECT * FROM category WHERE id = ?
    `, [req.params.id]);

    if (categories.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const workspaceId = categories[0].workspace_id;

    // Verify user has access to the workspace
    const hasAccess = await checkWorkspaceAccess(workspaceId, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this category' });
    }

    const [result] = await db.query(`
      DELETE FROM category
      WHERE id = ?
    `, [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.status(204).send();
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(428).json({ error: 'Cannot delete category with transactions' });
    }
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

module.exports = router;