/**
 * Books API Router
 * Handles all book-related operations including:
 * - Managing books (create, read, update, delete)
 * - Book soft deletion and r * Create a new book
 * 
 * @body {string} name - Required book name
 * @body {string} note - Optional book note
 * @body {string} currency_symbol - Currency symbol (default: '$')ation
 * - User access management for books
 * - Role assignment within books
 * 
 * Permission model:
 * - READ operations: Any book member (admin, collaborator, viewer)
 * - WRITE operations: Book editors (admin, collaborator)
 * - ADMIN operations: Book admins only
 * 
 * Book roles:
 * - admin: Full control including user management and book deletion
 * - collaborator: Can edit book content but not manage users
 * - viewer: Read-only access to book content
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireSuperAdmin } = require('../middleware/auth');
const {
  canAdmin,
  canWrite,
  canRead,
  getBookUsers,
  getBookById,
  getBookByIdIncludingDeleted
} = require('../utils/book');

/**
 * GET /books
 * List all books accessible to the current user
 * 
 * @permission Requires authentication, returns only books the user is a member of
 * @returns {Array} List of books the user has access to
 */
router.get('/', async (req, res) => {
  try {
    const [books] = await db.query(`
      SELECT w.*, wu.role 
      FROM book w
      INNER JOIN book_user wu ON w.id = wu.book_id
      WHERE wu.user_id = ? AND w.deleted_at IS NULL
      ORDER BY w.name ASC
    `, [req.user.id]);

    res.status(200).json(books);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

/**
 * GET /books/search
 * Search books by name or ID (admin only)
 * 
 * @query {string} q - Search query (book name or ID)
 * @query {number} limit - Maximum results to return (default: 10, max: 50)
 * @permission Super admin only
 * @returns {Array} List of matching books
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
        FROM book 
        WHERE deleted_at IS NULL 
        AND (id = ? OR CAST(id AS CHAR) LIKE ?)
        ORDER BY 
          CASE WHEN id = ? THEN 0 ELSE 1 END,
          name ASC
        LIMIT ?
      `;
      params = [parseInt(searchTerm), `${searchTerm}%`, parseInt(searchTerm), resultLimit];
    } else {
      // Search by book name (partial match, case-insensitive)
      query = `
        SELECT id, name, note, currency_symbol, created_at
        FROM book 
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

    const [books] = await db.query(query, params);
    res.status(200).json(books);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to search books' });
  }
});

/**
 * GET /books/all
 * Get all books (admin only)
 * 
 * @permission Super admin only
 * @returns {Array} List of all books
 * @deprecated Use /books/search instead for better performance
 */
router.get('/all', requireSuperAdmin, async (req, res) => {
  try {
    const [books] = await db.query(`
      SELECT id, name, note, currency_symbol, created_at
      FROM book 
      WHERE deleted_at IS NULL
      ORDER BY name ASC
    `);

    res.status(200).json(books);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch all books' });
  }
});

/**
 * GET /books/:id
 * Get details for a single book
 * 
 * @param {number} id - Book ID
 * @permission Read access to the book (admin, collaborator, viewer)
 * @returns {Object} Book details
 */
router.get('/:id', async (req, res) => {
  try {
    // First check if the book exists
    const book = await getBookById(req.params.id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Then check if user has read access
    const { allowed, message } = await canRead(req.params.id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    res.status(200).json(book);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch book' });
  }
});

/**
 * POST /books
 * Create a new book
 * 
 * @body {string} name - Required book name
 * @body {string} note - Optional book note
 * @body {string} currency_symbol - Currency symbol, defaults to '$'
 * @body {string} week_start - First day of the week, defaults to 'monday'
 * @permission Any authenticated user can create a book
 * @returns {Object} Newly created book
 * 
 * Note: Creating user is automatically assigned the admin role in the new book
 */
router.post('/', async (req, res) => {
  const { name, note = null, currency_symbol = '$', week_start = 'monday' } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    // Use a transaction to ensure book and user association are created together
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Create the book
      const [result] = await connection.query(
        'INSERT INTO book (name, note, currency_symbol, week_start) VALUES (?, ?, ?, ?)',
        [name, note, currency_symbol, week_start]
      );

      // Add current user as admin of the book
      await connection.query(
        'INSERT INTO book_user (book_id, user_id, role) VALUES (?, ?, ?)',
        [result.insertId, req.user.id, 'admin']
      );

      await connection.commit();
      connection.release();

      const book = await getBookById(result.insertId);
      res.status(201).json(book);
    } catch (err) {
      await connection.rollback();
      connection.release();
      throw err;
    }
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to create book' });
  }
});

/**
 * PUT /books/:id
 * Update book details
 * 
 * @param {number} id - Book ID
 * @body {string} name - Required book name
 * @body {string} note - Optional book note
 * @body {string} currency_symbol - Currency symbol
 * @body {string} week_start - First day of the week
 * @permission Admin access to the book (admin only)
 * @returns {Object} Updated book details
 */
router.put('/:id', async (req, res) => {
  const { name, note, currency_symbol, week_start } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    // First check if the book exists
    const existingBook = await getBookById(req.params.id);
    if (!existingBook) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Then check if user has admin access
    const { allowed, message } = await canAdmin(req.params.id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    const currencySymbol = currency_symbol !== undefined ? currency_symbol : existingBook.currency_symbol;
    const weekStart = week_start !== undefined ? week_start : existingBook.week_start;

    const [result] = await db.query(`
      UPDATE book        SET name = ?, 
          note = ?, 
          currency_symbol = ?, 
          week_start = ?
        WHERE id = ?
    `, [name, note, currencySymbol, weekStart, req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const book = await getBookById(req.params.id);
    res.status(200).json(book);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to update book' });
  }
});

/**
 * DELETE /books/:id
 * Soft delete a book
 * 
 * @param {number} id - Book ID
 * @permission Admin access to the book
 * @returns {void}
 */
router.delete('/:id', async (req, res) => {
  try {
    // First check if the book exists
    const book = await getBookById(req.params.id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Then check if user has admin access
    const { allowed, message } = await canAdmin(req.params.id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    const [result] = await db.query(`
      UPDATE book 
      SET deleted_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND deleted_at IS NULL
    `, [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Book not found or already deleted' });
    }

    res.status(200).json({ message: 'Book deleted successfully' });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to delete book' });
  }
});

/**
 * POST /books/:id/restore
 * Restore a soft-deleted book
 * 
 * @param {number} id - Book ID
 * @permission Superadmin only
 * @returns {Object} Restored book details
 */
router.post('/:id/restore', requireSuperAdmin, async (req, res) => {
  try {
    // First check if book exists (including soft-deleted ones)
    const book = await getBookByIdIncludingDeleted(req.params.id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Check if book is already active
    if (!book.deleted_at) {
      return res.status(400).json({ error: 'Book is already active' });
    }

    const [result] = await db.query(`
      UPDATE book 
      SET deleted_at = NULL 
      WHERE id = ? AND deleted_at IS NOT NULL
    `, [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Book not found or already restored' });
    }

    const restoredBook = await getBookById(req.params.id);
    res.status(200).json(restoredBook);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to restore book' });
  }
});

/**
 * DELETE /books/:id/permanent
 * Permanently delete a book and cascade delete all related data
 * 
 * @param {number} id - Book ID
 * @permission Superadmin only
 * @returns {void}
 * 
 * Note: This will cascade delete ALL related data including:
 * - All transactions in book accounts
 * - All account totals 
 * - All categories (including hierarchical categories)
 * - All accounts
 * - All book users
 * - The book itself
 */
router.delete('/:id/permanent', requireSuperAdmin, async (req, res) => {
  try {
    // First check if book exists (including soft-deleted ones)
    const book = await getBookByIdIncludingDeleted(req.params.id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Check if book is soft-deleted (requirement for permanent deletion)
    if (!book.deleted_at) {
      return res.status(400).json({ error: 'Book must be soft-deleted before permanent deletion' });
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // CASCADE DELETE ALL RELATED DATA

      // 1. Delete transactions first (they reference accounts and categories)
      await connection.query(`
        DELETE t FROM transaction t 
        INNER JOIN account a ON t.account_id = a.id 
        WHERE a.book_id = ?
      `, [req.params.id]);

      // 2. Delete totals (they reference accounts)
      await connection.query(`
        DELETE t FROM total t 
        INNER JOIN account a ON t.account_id = a.id 
        WHERE a.book_id = ?
      `, [req.params.id]);

      // 3. Delete categories (handle self-references by deleting children first)
      // First, delete child categories (categories with parent_category_id)
      await connection.query(`
        DELETE FROM category 
        WHERE book_id = ? AND parent_category_id IS NOT NULL
      `, [req.params.id]);

      // Then delete parent categories
      await connection.query(`
        DELETE FROM category 
        WHERE book_id = ? AND parent_category_id IS NULL
      `, [req.params.id]);

      // 4. Delete accounts
      await connection.query(`
        DELETE FROM account WHERE book_id = ?
      `, [req.params.id]);

      // 5. Delete book users
      await connection.query(`
        DELETE FROM book_user WHERE book_id = ?
      `, [req.params.id]);

      // 6. Finally delete the book
      const [result] = await connection.query(`
        DELETE FROM book WHERE id = ?
      `, [req.params.id]);

      if (result.affectedRows === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({ error: 'Book not found' });
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
    res.status(500).json({ error: 'Failed to permanently delete book' });
  }
});

/**
 * POST /books/:id/users
 * Add a user to a book
 * 
 * @param {number} id - Book ID
 * @body {number} userId - User ID to add
 * @body {string} role - Role to assign (admin, collaborator, viewer)
 * @permission Admin access to the book or superadmin
 * @returns {Array} Updated list of book users
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
    // First check if the book exists
    const book = await getBookById(req.params.id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
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

    // Check if user is already in book
    const [existing] = await db.query(`
      SELECT 1 FROM book_user 
      WHERE book_id = ? AND user_id = ?
    `, [req.params.id, userId]);

    if (existing.length > 0) {
      return res.status(409).json({ error: 'User already in book' });
    }

    // Add user to book with specified role
    await db.query(`
      INSERT INTO book_user (book_id, user_id, role) 
      VALUES (?, ?, ?)
    `, [req.params.id, userId, role]);

    const updatedUsers = await getBookUsers(req.params.id);
    res.status(201).json(updatedUsers);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to add user to book' });
  }
});

/**
 * DELETE /books/:id/users/:userId
 * Remove a user from a book
 * 
 * @param {number} id - Book ID
 * @param {number} userId - User ID to remove
 * @permission Admin access to the book or superadmin
 * @returns {void}
 */
router.delete('/:id/users/:userId', async (req, res) => {
  try {
    // First check if book exists
    const book = await getBookById(req.params.id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Then check admin permission (or is superadmin)
    if (!req.user.superadmin) {
      const { allowed, message } = await canAdmin(req.params.id, req.user.id);
      if (!allowed) {
        return res.status(403).json({ error: message });
      }
    }

    // Check if user exists in book first
    const [existingUser] = await db.query(`
      SELECT role FROM book_user 
      WHERE book_id = ? AND user_id = ?
    `, [req.params.id, req.params.userId]);

    if (existingUser.length === 0) {
      return res.status(404).json({ error: 'User not found in book' });
    }

    // Prevent removing the last admin (unless user is superadmin)
    if (existingUser[0].role === 'admin' && !req.user.superadmin) {
      const [adminCount] = await db.query(`
        SELECT COUNT(*) as count FROM book_user 
        WHERE book_id = ? AND role = 'admin'
      `, [req.params.id]);

      if (adminCount[0].count === 1) {
        return res.status(409).json({ error: 'Cannot remove the last admin from the book' });
      }
    }

    // Remove user from book
    const [result] = await db.query(`
      DELETE FROM book_user 
      WHERE book_id = ? AND user_id = ?
    `, [req.params.id, req.params.userId]);

    res.status(204).send();
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to remove user from book' });
  }
});

/**
 * PUT /books/:id/users/:userId
 * Update a user's role in a book
 * 
 * @param {number} id - Book ID
 * @param {number} userId - User ID to update
 * @body {string} role - New role to assign (admin, collaborator, viewer)
 * @permission Admin access to the book or superadmin
 * @returns {Array} Updated list of book users
 */
router.put('/:id/users/:userId', async (req, res) => {
  const { role } = req.body;

  if (!role || !['admin', 'collaborator', 'viewer'].includes(role)) {
    return res.status(400).json({ error: 'Valid role is required (admin, collaborator, or viewer)' });
  }

  try {
    // First check if the book exists
    const book = await getBookById(req.params.id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
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
        FROM book_user 
        WHERE book_id = ? AND role = 'admin'
      `, [req.params.id]);

      const [currentRole] = await db.query(`
        SELECT role 
        FROM book_user 
        WHERE book_id = ? AND user_id = ?
      `, [req.params.id, req.params.userId]);

      if (adminCount[0].count === 1 && currentRole[0]?.role === 'admin') {
        return res.status(409).json({ error: 'Cannot remove the last admin from the book' });
      }
    }

    // Update user's role
    const [result] = await db.query(`
      UPDATE book_user 
      SET role = ? 
      WHERE book_id = ? AND user_id = ?
    `, [role, req.params.id, req.params.userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found in book' });
    }

    const updatedUsers = await getBookUsers(req.params.id);
    res.status(200).json(updatedUsers);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

/**
 * GET /books/:id/users
 * List all users in a book
 * 
 * @param {number} id - Book ID
 * @permission Read access to the book (admin, collaborator, viewer) or superadmin
 * @returns {Array} List of book users
 */
router.get('/:id/users', async (req, res) => {
  try {
    // First check if the book exists
    const book = await getBookById(req.params.id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Superadmin can access users of any book
    if (!req.user.superadmin) {
      const { allowed, message } = await canRead(req.params.id, req.user.id);
      if (!allowed) {
        return res.status(403).json({ error: message });
      }
    }

    const users = await getBookUsers(req.params.id);
    res.status(200).json(users);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch book users' });
  }
});

module.exports = router;