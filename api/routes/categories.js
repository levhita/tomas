// src/routes/categories.js

const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all categories
router.get('/', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT * FROM category 
      ORDER BY name ASC
    `).all();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get single category
router.get('/:id', (req, res) => {
  try {
    const category = db.prepare(`
      SELECT * FROM category 
      WHERE id = ?
    `).get(req.params.id);

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

// Create category
router.post('/', (req, res) => {
  const { name, note = null, parent_category_id = null } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const insert = db.prepare(`
      INSERT INTO category (name, note, parent_category_id)
      VALUES (?, ?, ?)
    `);

    const result = insert.run(name, note, parent_category_id);

    const newCategory = db.prepare(`
      SELECT * FROM category 
      WHERE id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(newCategory);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update category
router.put('/:id', (req, res) => {
  const { name, note, parent_category_id } = req.body;

  try {
    const update = db.prepare(`
      UPDATE category
      SET name = ?,
          note = ?,
          parent_category_id = ?
      WHERE id = ?
    `).run(name, note, parent_category_id, req.params.id);

    if (update.changes === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const updated = db.prepare(`
      SELECT * FROM category 
      WHERE id = ?
    `).get(req.params.id);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete category
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare(`
      DELETE FROM category
      WHERE id = ?
    `).run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

module.exports = router;