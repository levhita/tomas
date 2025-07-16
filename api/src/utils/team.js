/**
 * Team Utilities Module
 * 
 * This module provides utility functions for team access control and management.
 * It implements the permission model for teams with three roles:
 * - admin: Full control (manage users, manage team and books, all write/read operations)
 * - collaborator: Write access (create/edit/delete content in books)
 * - viewer: Read-only access to team and books
 * 
 * These utilities are used throughout the API to enforce consistent
 * permission checks and access control across all team resources.
 */

const db = require('../db');


/**
 * Get user's role in a team
 * 
 * Queries the database to determine what role (if any) a user has
 * in a specific team. Only considers active (non-deleted) teams.
 * 
 * @param {number} teamId - The team ID
 * @param {number} userId - The user ID
 * @returns {Promise<string|null>} - Returns role ('admin', 'collaborator', 'viewer') or null if no access
 */
async function getUserRole(teamId, userId) {
  try {
    const [access] = await db.execute(`
      SELECT tu.role FROM team_user tu
      INNER JOIN team t ON tu.team_id = t.id
      WHERE tu.team_id = ? AND tu.user_id = ? AND t.deleted_at IS NULL
    `, [teamId, userId]);

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
 * - Managing team users (add/remove users, change roles)
 * - Managing team settings
 * - All write and read operations
 * 
 * Only users with the 'admin' role can perform these operations.
 * 
 * @param {number} teamId - The team ID
 * @param {number} userId - The user ID
 * @returns {Promise<{allowed: boolean, message: string}>} - Object with access decision and message
 */
async function canAdmin(teamId, userId) {
  const role = await getUserRole(teamId, userId);

  if (!role) {
    return { allowed: false, message: 'Access denied to this team' };
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
 * - Creating/updating/deleting content within team books
 * - Managing accounts, categories, and transactions
 * - Updating book settings
 * 
 * Users with either 'admin' or 'collaborator' roles can perform these operations.
 * 
 * @param {number} teamId - The team ID
 * @param {number} userId - The user ID
 * @returns {Promise<{allowed: boolean, message: string}>} - Object with access decision and message
 */
async function canWrite(teamId, userId) {
  const role = await getUserRole(teamId, userId);

  if (!role) {
    return { allowed: false, message: 'Access denied to this team' };
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
 * - Viewing team content and books
 * - Retrieving accounts, categories, and transactions
 * - Accessing team and book settings
 * 
 * Any user with access to the team ('admin', 'collaborator', or 'viewer')
 * can perform these operations.
 * 
 * @param {number} teamId - The team ID
 * @param {number} userId - The user ID
 * @returns {Promise<{allowed: boolean, message: string}>} - Object with access decision and message
 */
async function canRead(teamId, userId) {
  const role = await getUserRole(teamId, userId);

  if (!role) {
    return { allowed: false, message: 'Access denied to this team' };
  }

  // Role exists and is either 'admin', 'collaborator', or 'viewer'
  return { allowed: true, message: 'Access granted' };
}

/**
 * Get users of a team
 * 
 * Retrieves all users who have access to a team, along with their
 * roles and basic profile information. Can optionally include deleted teams.
 * 
 * This is typically used in team management interfaces and for
 * permission verification.
 * 
 * @param {number} teamId - The team ID to get users for
 * @param {boolean} includeDeleted - Whether to include deleted teams (default: false)
 * @returns {Promise<Array>} - Returns array of team users with their roles
 * 
 * @example
 * // Returns an array of objects like:
 * // [{ id: 1, username: 'johndoe', role: 'admin', created_at: '2023-01-01' }, ...]
 */
async function getTeamUsers(teamId, includeDeleted = false) {
  let query = `
    SELECT u.id, u.username, tu.role, u.created_at, u.active
    FROM user u
    INNER JOIN team_user tu ON u.id = tu.user_id
    INNER JOIN team t ON tu.team_id = t.id
    WHERE tu.team_id = ?`;
  
  if (!includeDeleted) {
    query += ' AND t.deleted_at IS NULL';
  }
  
  query += ' ORDER BY u.username ASC';

  const [users] = await db.execute(query, [teamId]);

  return users.map(user => ({
    ...user,
    active: user.active === 1
  }));
}

/**
 * Get team by ID
 * 
 * Retrieves a team's full details by its ID.
 * By default, excludes soft-deleted teams.
 * 
 * This function is commonly used to verify team existence
 * and to retrieve team settings.
 * 
 * @param {number} teamId - The team ID to get
 * @param {boolean} includeDeleted - Whether to include soft-deleted teams (default: false)
 * @returns {Promise<Object|null>} - Returns team object or null if not found
 * 
 * @example
 * // Returns an object like:
 * // { id: 1, name: 'Personal Finance Team', created_at: '2023-01-01', ... }
 */
async function getTeamById(teamId, includeDeleted = false) {
  let query = 'SELECT * FROM team WHERE id = ?';
  if (!includeDeleted) {
    query += ' AND deleted_at IS NULL';
  }

  const [teams] = await db.execute(query, [teamId]);
  const team = teams[0];
  
  if (!team) {
    return null;
  }

  // Get active book count for this team
  const [activeCounts] = await db.execute(`
    SELECT COUNT(*) as book_count
    FROM book
    WHERE team_id = ? AND deleted_at IS NULL
  `, [teamId]);

  // Get soft-deleted book count for this team
  const [deletedCounts] = await db.execute(`
    SELECT COUNT(*) as deleted_book_count
    FROM book
    WHERE team_id = ? AND deleted_at IS NOT NULL
  `, [teamId]);

  return {
    ...team,
    book_count: activeCounts[0].book_count || 0,
    deleted_book_count: deletedCounts[0].deleted_book_count || 0
  };
}

/**
 * Get team by book ID
 * 
 * Retrieves the team that owns a specific book.
 * Used to check team permissions when accessing book resources.
 * Only returns active (non-deleted) teams.
 * 
 * @param {number} bookId - The book ID to get team for
 * @returns {Promise<Object|null>} - Returns team object or null if not found
 */
async function getTeamByBookId(bookId) {

  
  const [teams] = await db.execute(`
    SELECT t.* FROM team t
    INNER JOIN book b ON t.id = b.team_id
    WHERE b.id = ? AND b.deleted_at IS NULL AND t.deleted_at IS NULL
  `, [bookId]);

  return teams[0] || null;
}

/**
 * Get team by account ID
 * 
 * Retrieves the team that owns a specific account, via the account's book.
 * Only returns active (non-deleted) teams.
 * 
 * @param {number} accountId - The account ID to get team for
 * @returns {Promise<Object|null>} - Returns team object or null if not found
 */
async function getTeamByAccountId(accountId) {
  const [teams] = await db.query(
    `
    SELECT t.* FROM team t
    INNER JOIN book b ON t.id = b.team_id
    INNER JOIN account a ON a.book_id = b.id
    WHERE a.id = ? AND b.deleted_at IS NULL AND t.deleted_at IS NULL
    `,
    [accountId]
  );
  return teams.length > 0 ? teams[0] : null;
}

/**
 * Get the book for a given account, returns null if not found or soft-deleted.
 * @param {number} accountId
 * @returns {Promise<object|null>}
 */
async function getBookByAccountId(accountId) {
  const [rows] = await db.query(
    `
    SELECT b.* FROM book b
    INNER JOIN account a ON a.book_id = b.id
    WHERE a.id = ? AND b.deleted_at IS NULL
    `,
    [accountId]
  );
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Function exports
 * 
 * These utility functions enable consistent permission checking across the API.
 * They should be used in all routes that access team resources to ensure
 * proper access control.
 * 
 * Usage pattern:
 * 1. Get the team ID from the book using getTeamByBookId
 * 2. Call the appropriate can* function with the team ID
 * 3. Check the 'allowed' property to make the access control decision
 * 4. Use the 'message' property to inform the client if access is denied
 */
module.exports = {
  canAdmin,
  canWrite,
  canRead,
  getTeamUsers,
  getTeamById,
  getTeamByBookId,
  getUserRole,
  getTeamByAccountId,
  getBookByAccountId
};
