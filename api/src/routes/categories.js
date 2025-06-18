/**
 * Categories API Router
 * Handles all category-related operations including:
 * - Listing categories for a workspace
 * - Retrieving single category details
 * - Creating, updating and deleting categories
 * - Managing hierarchical category structure with parent-child relationships
 * 
 * Permission model:
 * - READ operations: Any workspace member (admin, collaborator, viewer)
 * - WRITE operations: Workspace editors (admin, collaborator)
 * 
 * Hierarchy constraints:
 * - Categories can only be nested two levels deep (parent-child)
 * - A category with children cannot become a child of another category
 * - Categories can only reference parents in the same workspace
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { canRead, canWrite } = require('../utils/workspace');

/**
 * GET /categories
 * List all categories for a workspace in alphabetical order by name
 * 
 * @query {number} workspace_id - Required workspace ID
 * @permission Read access to workspace (admin, collaborator, viewer)
 * @returns {Array} List of categories ordered alphabetically by name
 */
router.get('/', async (req, res) => {
  const workspaceId = req.query.workspace_id;

  if (!workspaceId) {
    return res.status(400).json({ error: 'workspace_id is required' });
  }

  try {
    // Verify user has read access to the workspace
    const { allowed, message } = await canRead(workspaceId, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    const [categories] = await db.query(`
      SELECT * FROM category 
      WHERE workspace_id = ?
      ORDER BY name COLLATE utf8mb4_unicode_ci ASC
    `, [workspaceId]);

    res.status(200).json(categories);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

/**
 * GET /categories/:id
 * Get details for a single category
 * 
 * @param {number} id - Category ID
 * @permission Read access to the category's workspace
 * @returns {Object} Category details
 */
router.get('/:id', async (req, res) => {
  try {
    const [categories] = await db.query(`
      SELECT * FROM category 
      WHERE id = ?
    `, [req.params.id]);

    if (categories.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check if user has read access to the workspace this category belongs to
    const workspaceId = categories[0].workspace_id;
    const { allowed, message } = await canRead(workspaceId, req.user.id);

    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    res.status(200).json(categories[0]);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

/**
 * POST /categories
 * Create a new category
 * 
 * @body {string} name - Required category name
 * @body {string} note - Optional category description
 * @body {number} parent_category_id - Optional parent category ID for hierarchical categories
 * @body {number} workspace_id - Required workspace ID
 * @body {string} type - Category type (expense or income), defaults to expense. Ignored if parent_category_id is provided.
 * @permission Write access to the workspace (admin, collaborator)
 * @returns {Object} Newly created category
 * 
 * Hierarchy constraints:
 * - If parent_category_id is provided, that category must not have a parent itself
 * - Parent category must belong to the same workspace
 * - Child categories automatically inherit parent type (type parameter is ignored)
 */
router.post('/', async (req, res) => {
  let { name, note = null, parent_category_id = null, workspace_id, type = 'expense' } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Name is required' });
  }

  if (!workspace_id) {
    return res.status(400).json({ error: 'workspace_id is required' });
  }

  // Validate name length (VARCHAR(255) limit)
  if (name.length > 255) {
    return res.status(400).json({ error: 'Category name cannot exceed 255 characters' });
  }

  // Validate type enum
  if (type && !['expense', 'income'].includes(type)) {
    return res.status(400).json({ error: 'Type must be either "expense" or "income"' });
  }

  try {
    // Verify user has write access to the workspace
    const { allowed, message } = await canWrite(workspace_id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    // If parent category is specified, verify it belongs to the same workspace
    // and enforce the two-level hierarchy limit
    if (parent_category_id) {
      const [parentCategories] = await db.query(`
        SELECT c.*, 
               (SELECT COUNT(*) FROM category WHERE parent_category_id = c.id) AS child_count,
               (SELECT parent_category_id FROM category WHERE id = c.id) AS parent_id
        FROM category c 
        WHERE c.id = ?
      `, [parent_category_id]);

      if (parentCategories.length === 0) {
        return res.status(404).json({ error: 'Parent category not found' });
      }

      // Ensure parent belongs to the same workspace
      if (parentCategories[0].workspace_id !== parseInt(workspace_id)) {
        return res.status(400).json({ error: 'Parent category must belong to the same workspace' });
      }

      // Enforce two-level nesting limit - if parent already has a parent, reject
      if (parentCategories[0].parent_id !== null) {
        return res.status(400).json({
          error: 'Categories can only be nested two levels deep. The selected parent already has a parent.'
        });
      }

      // Enforce type inheritance - child category MUST inherit parent type, ignore passed type
      type = parentCategories[0].type;
    }

    // Create the new category
    const [result] = await db.query(`
      INSERT INTO category (name, note, type, parent_category_id, workspace_id)
      VALUES (?, ?, ?, ?, ?)
    `, [name, note, type, parent_category_id, workspace_id]);

    // Fetch the created category with all fields
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

/**
 * PUT /categories/:id
 * Update an existing category
 * 
 * @param {number} id - Category ID to update
 * @body {string} name - Category name
 * @body {string} note - Category description
 * @body {string} type - Category type (expense or income)
 * @body {number} parent_category_id - Parent category ID for hierarchical categories
 * @permission Write access to the category's workspace (admin, collaborator)
 * @returns {Object} Updated category
 * 
 * Hierarchy constraints:
 * - A category cannot be its own parent
 * - A category with children cannot become a child of another category
 * - Parent category must belong to the same workspace
 * - If parent_category_id is provided, that category must not have a parent itself
 * - Child categories must have the same type as their parent
 * - When a parent category type changes, all child categories inherit the new type
 * - When moving a category to a different parent, type is inherited from new parent
 */
router.put('/:id', async (req, res) => {
  let { name, note, type, parent_category_id } = req.body;

  try {
    // First fetch the category to check workspace access
    const [categories] = await db.query(`
      SELECT * FROM category WHERE id = ?
    `, [req.params.id]);

    if (categories.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const workspaceId = categories[0].workspace_id;
    const categoryId = parseInt(req.params.id);
    const currentCategory = categories[0];

    // Verify user has write access to the workspace
    const { allowed, message } = await canWrite(workspaceId, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    // Check if this category has children to enforce type inheritance
    const [childCheck] = await db.query(`
      SELECT COUNT(*) AS child_count
      FROM category
      WHERE parent_category_id = ?
    `, [categoryId]);

    const hasChildren = childCheck[0].child_count > 0;

    // If parent category is being updated, perform additional checks
    if (parent_category_id !== undefined) {
      if (parent_category_id !== null) {
        // Check if trying to assign itself as parent (circular reference)
        if (parseInt(parent_category_id) === categoryId) {
          return res.status(400).json({ error: 'A category cannot be its own parent' });
        }

        const [parentCategories] = await db.query(`
          SELECT c.*, 
                 (SELECT parent_category_id FROM category WHERE id = c.id) AS parent_id
          FROM category c
          WHERE c.id = ?
        `, [parent_category_id]);

        if (parentCategories.length === 0) {
          return res.status(404).json({ error: 'Parent category not found' });
        }

        // Ensure parent belongs to the same workspace
        if (parentCategories[0].workspace_id !== workspaceId) {
          return res.status(400).json({ error: 'Parent category must belong to the same workspace' });
        }

        // Enforce two-level nesting limit - if parent already has a parent, reject
        if (parentCategories[0].parent_id !== null) {
          return res.status(400).json({
            error: 'Categories can only be nested two levels deep. The selected parent already has a parent.'
          });
        }

        // Check if this category has children (can't make a category with children a child of another category)
        if (hasChildren) {
          return res.status(400).json({
            error: 'Cannot assign a parent to this category because it already has child categories'
          });
        }

        // Enforce type inheritance - when setting a parent, type must inherit from parent
        type = parentCategories[0].type;
      } else if (parent_category_id === null && currentCategory.parent_category_id !== null) {
        // Category is being moved from child to root level - type can be changed
        // but if not provided, keep current type
        if (type === undefined) {
          type = currentCategory.type;
        }
      }
    } else if (currentCategory.parent_category_id !== null && type !== undefined) {
      // Category remains a child - cannot change type independently, inherit from parent
      const [parentCategories] = await db.query(`
        SELECT type FROM category WHERE id = ?
      `, [currentCategory.parent_category_id]);

      if (parentCategories.length > 0) {
        type = parentCategories[0].type;
      }
    }

    // Start a transaction for the update operation
    await db.query('START TRANSACTION');

    try {
      // Build dynamic update query - only update fields that are provided
      const updateFields = [];
      const updateValues = [];

      if (name !== undefined) {
        // Validate name if provided
        if (!name || name.trim() === '') {
          await db.query('ROLLBACK');
          return res.status(400).json({ error: 'Name cannot be empty' });
        }
        if (name.length > 255) {
          await db.query('ROLLBACK');
          return res.status(400).json({ error: 'Category name cannot exceed 255 characters' });
        }
        updateFields.push('name = ?');
        updateValues.push(name);
      }

      if (note !== undefined) {
        updateFields.push('note = ?');
        updateValues.push(note);
      }

      if (type !== undefined) {
        // Validate type if provided
        if (!['expense', 'income'].includes(type)) {
          await db.query('ROLLBACK');
          return res.status(400).json({ error: 'Type must be either "expense" or "income"' });
        }
        updateFields.push('type = ?');
        updateValues.push(type);
      }

      if (parent_category_id !== undefined) {
        updateFields.push('parent_category_id = ?');
        updateValues.push(parent_category_id);
      }

      // If no fields to update, return current category
      if (updateFields.length === 0) {
        await db.query('ROLLBACK');
        return res.status(200).json(currentCategory);
      }

      updateValues.push(categoryId);

      // Update the category
      const [result] = await db.query(`
        UPDATE category
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `, updateValues);

      if (result.affectedRows === 0) {
        await db.query('ROLLBACK');
        return res.status(404).json({ error: 'Category not found' });
      }

      // If this category has children and the type changed, update all children
      if (hasChildren && type !== undefined && type !== currentCategory.type) {
        await db.query(`
          UPDATE category
          SET type = ?
          WHERE parent_category_id = ?
        `, [type, categoryId]);
      }

      await db.query('COMMIT');

      // Fetch the updated category
      const [updatedCategories] = await db.query(`
        SELECT * FROM category 
        WHERE id = ?
      `, [categoryId]);

      res.status(200).json(updatedCategories[0]);
    } catch (transactionError) {
      await db.query('ROLLBACK');
      throw transactionError;
    }
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

/**
 * DELETE /categories/:id
 * Delete a category
 * 
 * @param {number} id - Category ID to delete
 * @permission Write access to the category's workspace (admin, collaborator)
 * @returns {null} 204 No Content on success
 * @throws {Error} 428 Precondition Required if category has transactions
 * 
 * Note: Categories with child categories or referenced by transactions cannot be deleted
 */
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

    // Verify user has write access to the workspace
    const { allowed, message } = await canWrite(workspaceId, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
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