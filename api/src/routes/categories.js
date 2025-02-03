const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all categories
router.get('/', async (req, res) => {
  try {
    const [categories] = await db.query(`
      SELECT * FROM category 
      ORDER BY name ASC
    `);
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
    res.status(200).json(categories[0]);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

// Create category
router.post('/', async (req, res) => {
  const { name, note = null, parent_category_id = null } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const [result] = await db.query(`
      INSERT INTO category (name, note, parent_category_id)
      VALUES (?, ?, ?)
    `, [name, note, parent_category_id]);

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
  const { name, note, parent_category_id } = req.body;

  try {
    const [result] = await db.query(`
      UPDATE category
      SET name = ?,
          note = ?,
          parent_category_id = ?
      WHERE id = ?
    `, [name, note, parent_category_id, req.params.id]);

    if (result.affectedRows === 0) {
      console.error('Database error:', err);
      return res.status(404).json({ error: 'Category not found' });
    }

    const [categories] = await db.query(`
      SELECT * FROM category 
      WHERE id = ?
    `, [req.params.id]);

    res.status(200).json(categories[0]);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete category
router.delete('/:id', async (req, res) => {
  try {
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