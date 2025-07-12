/**
 * Categories API Router
 * Handles all category-related operations including:
 * - Retrieving single category details
 * - Creating, updating and deleting categories
 * - Managing hierarchical category structure with parent-child relationships
 * 
 * Note: Category listing by book is now handled by /api/books/:id/categories endpoint
 * 
 * Permission model:
 * - READ operations: Any team member (admin, collaborator, viewer)
 * - WRITE operations: Team editors (admin, collaborator)
 * 
 * Hierarchy constraints:
 * - Categories can only be nested two levels deep (parent-child)
 * - A category with children cannot become a child of another category
 * - Categories can only reference parents in the same book
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { canRead, canWrite, getTeamByBookId } = require('../utils/team');



/**
 * @swagger
 * /categories/{id}:
 *   get:
 *     summary: Get details for a single category
 *     description: Retrieve details for a specific category by ID. Requires read access to the category's book via team membership.
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         description: Failed to fetch category
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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

    // Check if user has access to the book this category belongs to via team membership
    const team = await getTeamByBookId(categories[0].book_id);
    if (!team) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const { allowed, message } = await canRead(team.id, req.user.id);
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
 * @swagger
 * /categories:
 *   post:
 *     summary: Create a new category
 *     description: |
 *       Create a new category within a book. Supports hierarchical categories with parent-child relationships.
 *       
 *       **Hierarchy constraints:**
 *       - If parent_category_id is provided, that category must not have a parent itself
 *       - Parent category must belong to the same book
 *       - Child categories automatically inherit parent type (type parameter is ignored)
 *       - Categories can only be nested two levels deep
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CategoryInput'
 *     responses:
 *       201:
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         description: Failed to create category
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', async (req, res) => {
  let { name, note = null, parent_category_id = null, book_id, type = 'expense' } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Name is required' });
  }

  if (!book_id) {
    return res.status(400).json({ error: 'book_id is required' });
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
    // Verify user has write access to the book via team membership
    const team = await getTeamByBookId(book_id);
    if (!team) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const { allowed, message } = await canWrite(team.id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    // If parent category is specified, verify it belongs to the same book
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

      // Ensure parent belongs to the same book
      if (parentCategories[0].book_id !== parseInt(book_id)) {
        return res.status(400).json({ error: 'Parent category must belong to the same book' });
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
      INSERT INTO category (name, note, type, parent_category_id, book_id)
      VALUES (?, ?, ?, ?, ?)
    `, [name, note, type, parent_category_id, book_id]);

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
 * @swagger
 * /categories/{id}:
 *   put:
 *     summary: Update an existing category
 *     description: |
 *       Update an existing category. Supports hierarchical category management with strict constraints.
 *       
 *       **Hierarchy constraints:**
 *       - A category cannot be its own parent
 *       - A category with children cannot become a child of another category
 *       - Parent category must belong to the same book
 *       - If parent_category_id is provided, that category must not have a parent itself
 *       - Child categories must have the same type as their parent
 *       - When a parent category type changes, all child categories inherit the new type
 *       - When moving a category to a different parent, type is inherited from new parent
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 255
 *                 description: Category name
 *               note:
 *                 type: string
 *                 nullable: true
 *                 description: Category description or notes
 *               type:
 *                 type: string
 *                 enum: [expense, income]
 *                 description: Category type (note - may be overridden by parent inheritance)
 *               parent_category_id:
 *                 type: integer
 *                 nullable: true
 *                 description: Parent category ID for hierarchical categories
 *     responses:
 *       200:
 *         description: Category updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       428:
 *         description: Precondition Failed - Hierarchy constraint violation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to update category
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', async (req, res) => {
  let { name, note, type, parent_category_id } = req.body;

  try {
    // First fetch the category to check book access
    const [categories] = await db.query(`
      SELECT * FROM category WHERE id = ?
    `, [req.params.id]);

    if (categories.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const bookId = categories[0].book_id;
    const categoryId = parseInt(req.params.id);
    const currentCategory = categories[0];

    // Verify user has write access to the book via team membership
    const team = await getTeamByBookId(bookId);
    if (!team) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const { allowed, message } = await canWrite(team.id, req.user.id);
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

    // Handle parent category updates and type inheritance
    if (parent_category_id !== undefined) {
      // parent_category_id is explicitly provided in the request
      if (parent_category_id !== null) {
        // Setting a new parent category

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

        // Ensure parent belongs to the same book
        if (parentCategories[0].book_id !== bookId) {
          return res.status(400).json({ error: 'Parent category must belong to the same book' });
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
      } else {
        // parent_category_id is explicitly set to null - moving to root level
        // Type can be changed when moving to root level, but if not provided, keep current type
        if (type === undefined) {
          type = currentCategory.type;
        }
      }
    } else {
      // parent_category_id is not provided - keeping current parent relationship
      if (currentCategory.parent_category_id !== null && type !== undefined) {
        // Category currently has a parent and type is being updated
        // Child categories must inherit type from parent, cannot change independently
        const [parentCategories] = await db.query(`
          SELECT type FROM category WHERE id = ?
        `, [currentCategory.parent_category_id]);

        if (parentCategories.length > 0) {
          type = parentCategories[0].type;
        }
      }
      // If no parent currently, or no type update requested, no additional logic needed
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
 * @swagger
 * /categories/{id}:
 *   delete:
 *     summary: Delete a category (soft delete)
 *     description: |
 *       Mark a category as deleted (soft delete). The category will be marked as deleted 
 *       and excluded from future queries but preserved in the database for data integrity.
 *       
 *       **Constraints:**
 *       - Cannot delete categories that have child categories
 *       - Cannot delete categories that are referenced by transactions
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID to delete
 *     responses:
 *       204:
 *         description: Category deleted successfully (No Content)
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       428:
 *         description: Precondition Failed - Category has dependencies
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Cannot delete category with subcategories or referenced by transactions
 *       500:
 *         description: Failed to delete category
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', async (req, res) => {
  try {
    // First fetch the category to check book access
    const [categories] = await db.query(`
      SELECT * FROM category WHERE id = ?
    `, [req.params.id]);

    if (categories.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const bookId = categories[0].book_id;

    // Verify user has write access to the book via team membership
    const team = await getTeamByBookId(bookId);
    if (!team) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { allowed, message } = await canWrite(team.id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    // No need to check for transactions - they will have their category_id set to null

    // Check if there are any child categories
    const [children] = await db.query(`
      SELECT COUNT(*) as count FROM category 
      WHERE parent_category_id = ?
    `, [req.params.id]);

    if (children[0].count > 0) {
      return res.status(428).json({ error: 'Cannot delete category with child categories' });
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
    // Only handle child category reference constraint, transactions can be set to null
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(428).json({ error: 'Cannot delete category with child categories' });
    }
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

module.exports = router;