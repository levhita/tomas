/**
 * Books API Router
 * Handles all book-related operations including:
 * - Managing books (create, read, update, delete)
 * - Book soft deletion and restoration
 * 
 * Permission model (team-based):
 * - READ operations: Any team member (admin, collaborator, viewer)
 * - WRITE operations: Team editors (admin, collaborator)
 * - ADMIN operations: Team admins only
 * 
 * Team roles:
 * - admin: Full control including book management and deletion
 * - collaborator: Can edit book content but not manage books
 * - viewer: Read-only access to book content
 * 
 * Note: User management for books has been moved to teams.
 * Books are now accessed based on team membership.
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const {
  getBookById,
  getBookByIdIncludingDeleted
} = require('../utils/book');
const {
  canRead,
  canWrite,
  canAdmin,
  getTeamByBookId,
  getUserRole
} = require('../utils/team');

/**
 * GET /books
 * List all books for a specific team
 * 
 * @query {number} teamId - Required team ID
 * @permission Requires authentication and team membership (any role)
 * @returns {Array} List of books for the specified team
 */
router.get('/', async (req, res) => {
  const teamId = req.query.teamId;

  if (!teamId) {
    return res.status(400).json({ error: 'teamId parameter is required' });
  }

  try {
    // Check if user has read access to this team
    const { allowed, message } = await canRead(teamId, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    // Get user's role in this team
    const userRole = await getUserRole(teamId, req.user.id);

    const [books] = await db.query(`
      SELECT b.*, t.name as team_name
      FROM book b
      INNER JOIN team t ON b.team_id = t.id
      WHERE b.team_id = ? AND b.deleted_at IS NULL AND t.deleted_at IS NULL
      ORDER BY b.name ASC
    `, [teamId]);

    // Add role to each book for consistency with previous API
    const booksWithRole = books.map(book => ({
      ...book,
      role: userRole
    }));

    res.status(200).json(booksWithRole);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});



/**
 * GET /books/:id
 * Get details for a single book
 * 
 * @param {number} id - Book ID
 * @permission Read access via team membership (admin, collaborator, viewer) or superadmin
 * @returns {Object} Book details
 */
router.get('/:id', async (req, res) => {
  try {
    // First check if the book exists
    const book = await getBookById(req.params.id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Check team-based access for all users including superadmin
    const team = await getTeamByBookId(req.params.id);
    if (!team) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const { allowed, message } = await canRead(team.id, req.user.id);
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
 * Create a new book within a team
 * 
 * @body {string} name - Required book name
 * @body {number} teamId - Required team ID where the book will be created
 * @body {string} note - Optional book note
 * @body {string} currency_symbol - Currency symbol, defaults to '$'
 * @body {string} week_start - First day of the week, defaults to 'monday'
 * @permission Admin or collaborator access to the specified team
 * @returns {Object} Newly created book
 */
router.post('/', async (req, res) => {
  const { name, teamId, note = null, currency_symbol = '$', week_start = 'monday' } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  if (!teamId) {
    return res.status(400).json({ error: 'Team ID is required' });
  }

  try {
    // Import team utilities
    const { canWrite: canWriteTeam, getTeamById } = require('../utils/team');

    // Check if team exists
    const team = await getTeamById(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check if user has write access to the team
    const { allowed, message } = await canWriteTeam(teamId, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    // Create the book
    const [result] = await db.query(
      'INSERT INTO book (name, note, currency_symbol, week_start, team_id) VALUES (?, ?, ?, ?, ?)',
      [name, note, currency_symbol, week_start, teamId]
    );

    const book = await getBookById(result.insertId);
    res.status(201).json(book);
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
 * @permission Write access via team membership (admin or collaborator) or superadmin
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

    // Check team-based write permissions for all users including superadmin
    const team = await getTeamByBookId(req.params.id);
    if (!team) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const { allowed, message } = await canWrite(team.id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    const currencySymbol = currency_symbol !== undefined ? currency_symbol : existingBook.currency_symbol;
    const weekStart = week_start !== undefined ? week_start : existingBook.week_start;

    const [result] = await db.query(`
      UPDATE book 
      SET name = ?, 
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
 * @permission Admin access via team membership or superadmin
 * @returns {void}
 */
router.delete('/:id', async (req, res) => {
  try {
    // First check if the book exists
    const book = await getBookById(req.params.id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Check team-based admin permissions for all users including superadmin
    const team = await getTeamByBookId(req.params.id);
    if (!team) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const { allowed, message } = await canAdmin(team.id, req.user.id);
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
 * @permission Team admin only
 * @returns {Object} Restored book details
 */
router.post('/:id/restore', async (req, res) => {
  try {
    // First check if book exists (including soft-deleted ones)
    const book = await getBookByIdIncludingDeleted(req.params.id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Check if user has admin access to the team that owns this book
    const { allowed, message } = await canAdmin(book.team_id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
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
 * @permission Team admin only
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
router.delete('/:id/permanent', async (req, res) => {
  try {
    // First check if book exists (including soft-deleted ones)
    const book = await getBookByIdIncludingDeleted(req.params.id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Check if user has admin access to the team that owns this book
    const { allowed, message } = await canAdmin(book.team_id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
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

module.exports = router;