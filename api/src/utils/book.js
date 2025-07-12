/**
 * Book Utilities Module
 * 
 * This module provides utility functions for book access control and management.
 * It implements the permission model for books with three roles:
 * - admin: Full control (manage users, delete book, all write/read operations)
 * - collaborator: Write access (create/edit/delete content)
 * - viewer: Read-only access
 * 
 * These utilities are used throughout the API to enforce consistent
 * permission checks and access control across all book resources.
 */

const db = require('../db');

/**
 * Get user's role in a book through team membership
 * 
 * Queries the database to determine what role (if any) a user has
 * in a specific book through their team membership. Only considers
 * books in active (non-deleted) teams.
 * 
 * @param {number} bookId - The book ID
 * @param {number} userId - The user ID
 * @returns {Promise<string|null>} - Returns role ('admin', 'collaborator', 'viewer') or null if no access
 */
async function getUserRole(bookId, userId) {
  try {
    const [access] = await db.execute(`
      SELECT tu.role 
      FROM team_user tu
      INNER JOIN book b ON tu.team_id = b.team_id
      INNER JOIN team t ON tu.team_id = t.id
      WHERE b.id = ? AND tu.user_id = ? AND b.deleted_at IS NULL AND t.deleted_at IS NULL
    `, [bookId, userId]);

    return access.length > 0 ? access[0].role : null;
  } catch (error) /* istanbul ignore next: database error cannot be replicated */ {
    console.error('Error getting user role:', error);
    throw error;
  }
}

/**
 * Check if user can perform admin operations (full access)
 * 
 * Admin operations include:
 * - Managing book users (add/remove users, change roles)
 * - Deleting or permanently deleting a book
 * - All write and read operations
 * 
 * Only users with the 'admin' role can perform these operations.
 * 
 * @param {number} bookId - The book ID
 * @param {number} userId - The user ID
 * @returns {Promise<{allowed: boolean, message: string}>} - Object with access decision and message
 */
async function canAdmin(bookId, userId) {
  const role = await getUserRole(bookId, userId);

  if (!role) {
    return { allowed: false, message: 'Access denied to this book' };
  }

  if (role !== 'admin') {
    return { allowed: false, message: 'Admin privileges required for this operation' };
  }

  // Role exists and is 'admin'
  return { allowed: true, message: 'Access granted' };
}

/**
 * Check if user can perform write operations
 * 
 * Write operations include:
 * - Creating/updating/deleting content within a book
 * - Managing accounts, categories, and transactions
 * - Updating book settings
 * 
 * Users with either 'admin' or 'collaborator' roles can perform these operations.
 * 
 * @param {number} bookId - The book ID
 * @param {number} userId - The user ID
 * @returns {Promise<{allowed: boolean, message: string}>} - Object with access decision and message
 */
async function canWrite(bookId, userId) {
  const role = await getUserRole(bookId, userId);

  if (!role) {
    return { allowed: false, message: 'Access denied to this book' };
  }

  if (role === 'viewer') {
    return { allowed: false, message: 'Write access required for this operation' };
  }

  // Role exists and is either 'admin' or 'collaborator'
  return { allowed: true, message: 'Access granted' };
}

/**
 * Check if user can perform read operations
 * 
 * Read operations include:
 * - Viewing book content
 * - Retrieving accounts, categories, and transactions
 * - Accessing book settings
 * 
 * Any user with access to the book ('admin', 'collaborator', or 'viewer')
 * can perform these operations.
 * 
 * @param {number} bookId - The book ID
 * @param {number} userId - The user ID
 * @returns {Promise<{allowed: boolean, message: string}>} - Object with access decision and message
 */
async function canRead(bookId, userId) {
  const role = await getUserRole(bookId, userId);

  if (!role) {
    return { allowed: false, message: 'Access denied to this book' };
  }

  // Role exists and is either 'admin', 'collaborator', or 'viewer'
  return { allowed: true, message: 'Access granted' };
}

/**
 * Get users of a book through team membership
 * 
 * Retrieves all users who have access to a book through their
 * team membership, along with their roles and basic profile information.
 * 
 * This is typically used in book management interfaces and for
 * permission verification.
 * 
 * @param {number} bookId - The book ID to get users for
 * @returns {Promise<Array>} - Returns array of book users with their roles
 * 
 * @example
 * // Returns an array of objects like:
 * // [{ id: 1, username: 'johndoe', role: 'admin', created_at: '2023-01-01' }, ...]
 */
async function getBookUsers(bookId) {
  const [users] = await db.execute(`
    SELECT u.id, u.username, tu.role, u.created_at
    FROM user u
    INNER JOIN team_user tu ON u.id = tu.user_id
    INNER JOIN book b ON tu.team_id = b.team_id
    INNER JOIN team t ON tu.team_id = t.id
    WHERE b.id = ? AND b.deleted_at IS NULL AND t.deleted_at IS NULL
    ORDER BY u.username ASC
  `, [bookId]);

  return users;
}

/**
 * Get book by ID (excludes deleted books and books in deleted teams)
 * 
 * Retrieves a book's full details by its ID. Only returns
 * active books (not soft-deleted ones) that belong to active teams.
 * 
 * This function is commonly used to verify book existence
 * and to retrieve book settings.
 * 
 * @param {number} bookId - The book ID to get
 * @returns {Promise<Object|null>} - Returns book object or null if not found/deleted
 * 
 * @example
 * // Returns an object like:
 * // { id: 1, name: 'Personal Finance', note: '...', created_at: '2023-01-01', ... }
 */
async function getBookById(bookId) {
  const [books] = await db.execute(`
    SELECT b.* FROM book b
    INNER JOIN team t ON b.team_id = t.id
    WHERE b.id = ? AND b.deleted_at IS NULL AND t.deleted_at IS NULL
  `, [bookId]);

  return books[0] || null;
}

/**
 * Get book by ID (includes deleted books)
 * 
 * Retrieves a book's full details by its ID, including soft-deleted ones.
 * This is primarily used for restore operations and admin functions.
 * 
 * @param {number} bookId - The book ID to get
 * @returns {Promise<Object|null>} - Returns book object or null if not found
 */
async function getBookByIdIncludingDeleted(bookId) {
  const [books] = await db.execute(
    'SELECT * FROM book WHERE id = ?',
    [bookId]
  );

  return books[0] || null;
}

/**
 * Function exports
 * 
 * These utility functions enable consistent permission checking across the API.
 * They should be used in all routes that access book resources to ensure
 * proper access control.
 * 
 * Usage pattern:
 * 1. Determine which level of access is needed for an operation
 * 2. Call the appropriate can* function
 * 3. Check the 'allowed' property to make the access control decision
 * 4. Use the 'message' property to inform the client if access is denied
 */
module.exports = {
  canAdmin,
  canWrite,
  canRead,
  getBookUsers,
  getBookById,
  getBookByIdIncludingDeleted
};