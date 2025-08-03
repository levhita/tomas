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
const { getBookById, getBookByIdIncludingDeleted } = require('../utils/book');
const { canRead, canWrite, canAdmin, getTeamByBookId, getUserRole } = require('../utils/team');

/**
 * @swagger
 * /books/{id}:
 *   get:
 *     summary: Get details for a single book
 *     description: Retrieve details for a specific book by ID. Requires read access via team membership.
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Book ID
 *     responses:
 *       200:
 *         description: Book details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Book'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
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

    const { allowed, message } = await canRead(team.id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    res.status(200).json(book);
  } catch (err) /* istanbul ignore next: unreachable in normal operation, only hit on db failure */ {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch book' });
  }
});

/**
 * @swagger
 * /books/{id}/accounts:
 *   get:
 *     summary: Get all accounts for a specific book
 *     description: Retrieve all accounts belonging to a specific book. Requires read access via team membership.
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Book ID
 *     responses:
 *       200:
 *         description: List of accounts for the book
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Account'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         description: Failed to fetch accounts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id/accounts', async (req, res) => {
  try {
    const bookId = req.params.id;

    // First check if the book exists
    const book = await getBookById(bookId);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Check team-based access for all users including superadmin
    const team = await getTeamByBookId(bookId);

    const { allowed, message } = await canRead(team.id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    // Fetch accounts for the book
    const [accounts] = await db.query(
      `
      SELECT * FROM account 
      WHERE book_id = ?
      ORDER BY name ASC
    `,
      [bookId]
    );

    res.status(200).json(accounts);
  } catch (err) /* istanbul ignore next: unreachable in normal operation, only hit on db failure */ {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

/**
 * @swagger
 * /books/{id}/categories:
 *   get:
 *     summary: Get all categories for a specific book
 *     description: Retrieve all categories belonging to a specific book, ordered alphabetically by name. Requires read access via team membership.
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Book ID
 *     responses:
 *       200:
 *         description: List of categories for the book ordered alphabetically by name
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Category'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         description: Failed to fetch categories
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id/categories', async (req, res) => {
  try {
    const bookId = req.params.id;

    // First check if the book exists
    const book = await getBookById(bookId);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Check team-based access for all users including superadmin
    const team = await getTeamByBookId(bookId);

    const { allowed, message } = await canRead(team.id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    // Fetch categories for the book
    const [categories] = await db.query(
      `
      SELECT * FROM category 
      WHERE book_id = ?
      ORDER BY name COLLATE utf8mb4_unicode_ci ASC
    `,
      [bookId]
    );

    res.status(200).json(categories);
  } catch (err) /* istanbul ignore next: unreachable in normal operation, only hit on db failure */ {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

/**
 * @swagger
 * /books/{id}/transactions:
 *   get:
 *     summary: Get all transactions for accounts in a specific book
 *     description: Retrieve all transactions for accounts within a book with optional filtering, pagination, and sorting.
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Book ID
 *       - in: query
 *         name: account_id
 *         schema:
 *           type: integer
 *         description: Optional filter by specific account ID within the book
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Optional start date filter (YYYY-MM-DD format)
 *         example: '2024-01-01'
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Optional end date filter (YYYY-MM-DD format)
 *         example: '2024-12-31'
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: sortKey
 *         schema:
 *           type: string
 *           default: 'date'
 *           enum: [date, amount, description, category_name, account_name, note, id]
 *         description: Field to sort by
 *       - in: query
 *         name: sortDirection
 *         schema:
 *           type: string
 *           default: 'desc'
 *           enum: [asc, desc]
 *         description: Sort direction
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter transactions by description, note, category or account
 *     responses:
 *       200:
 *         description: List of transactions for the book
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 transactions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transaction'
 *                 total:
 *                   type: integer
 *                   description: Total number of transactions matching the filters
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         description: Failed to fetch transactions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id/transactions', async (req, res) => {
  try {
    const bookId = req.params.id;
    let {
      account_id,
      start_date,
      end_date,
      search,
      page = 1,
      limit = 20,
      sortKey = 'date',
      sortDirection = 'desc'
    } = req.query;

    // Convert pagination parameters to integers
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    // allowedSortKeys type references the transaction type: Expense, Income, Payment, Charge
    // and the account_name references debit account or credit account
    // so we can sort by date, amount, description, account_name, category_name,
    // type (Expense, Income, Payment, Charge), note, id
    // but we need to ensure the sortKey is valid and the sortDirection is either asc or desc
    sortKey = sortKey.toLowerCase();
    sortDirection = sortDirection.toLowerCase();
    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 20;
    if (limit > 1000) limit = 1000; // Limit to a maximum of 1000 items per page
    if (offset < 0) offset = 0;
    // Validate sortKey and sortDirection
    // We only allow certain keys to prevent SQL injection attacks
    // and we only allow asc or desc for sortDirection
    // We also need to ensure the sortKey is a valid column in the transaction table
    const allowedSortKeys = [
      'date',
      'amount',
      'description',
      'account_name',
      'category_name',
      'type',
      'note',
      'id'
    ];
    const allowedDirections = ['asc', 'desc'];
    const effectiveSortKey = allowedSortKeys.includes(sortKey) ? sortKey : 'date';
    const effectiveDirection = allowedDirections.includes(sortDirection) ? sortDirection : 'desc';

    // First check if the book exists
    const book = await getBookById(bookId);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Check team-based access for all users including superadmin
    const team = await getTeamByBookId(bookId);

    const { allowed, message } = await canRead(team.id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    // Compose ORDER BY clause
    let orderBy;
    switch (sortKey) {
      case 'category_name':
        orderBy = 'c.name';
        break;
      case 'account_name':
        orderBy = 'a.name';
        break;
      case 'type':
        orderBy = `CASE 
            WHEN a.type = 'debit' AND t.amount > 0 THEN 'Income'
            WHEN a.type = 'debit' AND t.amount <= 0 THEN 'Expense'
            WHEN a.type = 'credit' AND t.amount < 0 THEN 'Payment'
            WHEN a.type = 'credit' AND t.amount >= 0 THEN 'Charge'
            ELSE 'Unknown'
          END`;
        break;
      case 'date':
      case 'amount':
      case 'description':
      case 'note':
      case 'id':
        orderBy = 't.' + sortKey;
        break;
      default:
        orderBy = 't.date'; // fallback to date if somehow an invalid key gets through
    }

    // Build query with optional filters
    let query = `
      SELECT 
        t.*,
        c.name as category_name,
        a.name as account_name,
        a.type as account_type
      FROM transaction AS t
      LEFT JOIN category c ON t.category_id = c.id 
      LEFT JOIN account a ON t.account_id = a.id
      WHERE a.book_id = ?
    `;
    const params = [bookId];

    // Add account filter if specified
    if (account_id) {
      // First verify the account belongs to this book
      const [accountCheck] = await db.query('SELECT id FROM account WHERE id = ? AND book_id = ?', [
        account_id,
        bookId
      ]);

      if (accountCheck.length === 0) {
        return res.status(404).json({ error: 'Account not found in this book' });
      }

      query += ` AND t.account_id = ?`;
      params.push(account_id);
    }

    // Add date range filter if specified
    if (start_date && end_date) {
      query += ` AND t.date BETWEEN ? AND ?`;
      params.push(start_date, end_date);
    }

    // Add search filter if specified
    if (search) {
      query += ` AND (
        t.description LIKE ? OR
        t.note LIKE ? OR
        c.name LIKE ? OR
        a.name LIKE ? OR
        CAST(t.amount AS CHAR) LIKE ? OR
        DATE_FORMAT(t.date, '%Y-%m-%d') LIKE ? OR
        CASE 
          WHEN a.type = 'debit' AND t.amount > 0 THEN 'Income'
          WHEN a.type = 'debit' AND t.amount <= 0 THEN 'Expense'
          WHEN a.type = 'credit' AND t.amount < 0 THEN 'Payment'
          WHEN a.type = 'credit' AND t.amount >= 0 THEN 'Charge'
          ELSE 'Unknown'
        END LIKE ?
      )`;
      const searchTerm = `%${search}%`;
      params.push(
        searchTerm,
        searchTerm,
        searchTerm,
        searchTerm,
        searchTerm,
        searchTerm,
        searchTerm
      );
    }

    // Add sorting and pagination
    query += ` ORDER BY ${orderBy} ${effectiveDirection.toUpperCase()} LIMIT ? OFFSET ?`;

    // Clone params to be able to run a separate count query
    const countParams = [...params];
    params.push(limitNum, offset);

    // Execute the main query to get paginated results
    const [transactions] = await db.query(query, params);

    // Get total count for pagination
    // OPTIMIZATION: For count query, simplify by removing unnecessary joins
    // We only need to count transactions for a specific book's accounts
    const countQuery = `
      SELECT COUNT(*) as count 
      FROM transaction AS t
      JOIN account a ON t.account_id = a.id  
      WHERE a.book_id = ?
    `;

    // Add filters to count query (all filters except pagination)
    let whereClause = '';
    if (account_id) whereClause += ` AND t.account_id = ?`;
    if (start_date && end_date) whereClause += ` AND t.date BETWEEN ? AND ?`;
    if (search) {
      whereClause += ` AND (
        t.description LIKE ? OR
        t.note LIKE ? OR
        c.name LIKE ? OR
        a.name LIKE ?
      )`;
    }

    const [countResult] = await db.query(countQuery + whereClause, countParams);
    const total = countResult[0]?.count || 0;

    // Convert exercised from 0/1 to boolean
    transactions.forEach((t) => (t.exercised = !!t.exercised));

    // Return results with pagination info
    res.status(200).json({
      transactions,
      total
    });
  } catch (err) /* istanbul ignore next: unreachable in normal operation, only hit on db failure */ {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

/**
 * @swagger
 * /books:
 *   post:
 *     summary: Create a new book within a team
 *     description: Create a new financial book within a specified team. Requires admin or collaborator access to the team.
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BookInput'
 *     responses:
 *       201:
 *         description: Book created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Book'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         description: Failed to create book
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', async (req, res) => {
  const { name, team_id, note = null, currency_symbol = '$', week_start = 'monday' } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  if (!team_id) {
    return res.status(400).json({
      error: 'Team ID is required'
    });
  }

  try {
    // Import team utilities
    const { canWrite: canWriteTeam, getTeamById } = require('../utils/team');

    // Check if team exists
    const team = await getTeamById(team_id);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check if user has write access to the team
    const { allowed, message } = await canWriteTeam(team_id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    // Create the book
    const [result] = await db.query(
      'INSERT INTO book (name, note, currency_symbol, week_start, team_id) VALUES (?, ?, ?, ?, ?)',
      [name, note, currency_symbol, week_start, team_id]
    );

    const book = await getBookById(result.insertId);
    res.status(201).json(book);
  } catch (err) /* istanbul ignore next: unreachable in normal operation, only hit on db failure */ {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to create book' });
  }
});

/**
 * @swagger
 * /books/{id}:
 *   put:
 *     summary: Update book details
 *     description: Update all fields of an existing book. Requires write access via team membership (admin or collaborator).
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Book ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: ['name']
 *             properties:
 *               name:
 *                 type: string
 *                 example: 'Updated Book Name'
 *               note:
 *                 type: string
 *                 nullable: true
 *                 example: 'Updated book description'
 *               currency_symbol:
 *                 type: string
 *                 example: '€'
 *               week_start:
 *                 type: string
 *                 enum: ['sunday', 'monday']
 *                 example: 'sunday'
 *     responses:
 *       200:
 *         description: Book updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Book'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         description: Failed to update book
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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

    const { allowed, message } = await canWrite(team.id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    const currencySymbol =
      currency_symbol !== undefined ? currency_symbol : existingBook.currency_symbol;
    const weekStart = week_start !== undefined ? week_start : existingBook.week_start;

    const [result] = await db.query(
      `
      UPDATE book 
      SET name = ?, 
          note = ?, 
          currency_symbol = ?, 
          week_start = ?
      WHERE id = ?
    `,
      [name, note, currencySymbol, weekStart, req.params.id]
    );

    const book = await getBookById(req.params.id);
    res.status(200).json(book);
  } catch (err) /* istanbul ignore next: unreachable in normal operation, only hit on db failure */ {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to update book' });
  }
});

/**
 * @swagger
 * /books/{id}:
 *   delete:
 *     summary: Soft delete a book
 *     description: Mark a book as deleted (soft delete). The book can be restored later. Requires admin access via team membership.
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Book ID
 *     responses:
 *       200:
 *         description: Book deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Book deleted successfully'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         description: Failed to delete book
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', async (req, res) => {
  try {
    // First check if book exists
    const book = await getBookById(req.params.id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Check if user has admin access to the team that owns this book
    const team = await getTeamByBookId(req.params.id);

    const { allowed, message } = await canAdmin(team.id, req.user.id);
    if (!allowed) {
      return res.status(403).json({ error: message });
    }

    // Soft delete the book
    const [result] = await db.query(
      `
      UPDATE book 
      SET deleted_at = NOW() 
      WHERE id = ? AND deleted_at IS NULL
    `,
      [req.params.id]
    );

    res.status(200).json({ message: 'Book deleted successfully' });
  } catch (err) /* istanbul ignore next: unreachable in normal operation, only hit on db failure */ {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to delete book' });
  }
});

/**
 * @swagger
 * /books/{id}/restore:
 *   post:
 *     summary: Restore a soft-deleted book
 *     description: Restore a previously soft-deleted book to active status. Requires admin access via team membership.
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Book ID
 *     responses:
 *       200:
 *         description: Book restored successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Book'
 *       400:
 *         description: Book is already active
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               status: error
 *               message: Book is already active
 *               code: BAD_REQUEST
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         description: Failed to restore book
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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

    const [result] = await db.query(
      `
      UPDATE book 
      SET deleted_at = NULL 
      WHERE id = ? AND deleted_at IS NOT NULL
    `,
      [req.params.id]
    );

    const restoredBook = await getBookById(req.params.id);
    res.status(200).json(restoredBook);
  } catch (err) /* istanbul ignore next: unreachable in normal operation, only hit on db failure */ {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to restore book' });
  }
});

/**
 * @swagger
 * /books/{id}/permanent:
 *   delete:
 *     summary: Permanently delete a book and cascade delete all related data
 *     description: |
 *       Permanently delete a book and all its related data. This action cannot be undone.
 *
 *       **Prerequisites:**
 *       - Book must be soft-deleted first
 *       - Requires team admin access
 *
 *       **Cascade deletion includes:**
 *       - All transactions in book accounts
 *       - All account totals
 *       - All categories (including hierarchical categories)
 *       - All accounts
 *       - The book itself
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Book ID
 *     responses:
 *       204:
 *         description: Book permanently deleted successfully (no content)
 *       400:
 *         description: Book must be soft-deleted before permanent deletion
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               status: error
 *               message: Book must be soft-deleted before permanent deletion
 *               code: BAD_REQUEST
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         description: Failed to permanently delete book
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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

    const [result] = await db.query(
      `
        DELETE FROM book WHERE id = ?
      `,
      [req.params.id]
    );
    res.status(204).json({ message: 'Book permanently deleted' });
  } catch (err) /* istanbul ignore next: unreachable in normal operation, only hit on db failure */ {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to permanently delete book' });
  }
});

module.exports = router;
