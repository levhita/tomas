/**
 * Workspace Utilities Module
 * 
 * This module provides utility functions for workspace access control and management.
 * It implements the permission model for workspaces with three roles:
 * - admin: Full control (manage users, delete workspace, all write/read operations)
 * - collaborator: Write access (create/edit/delete content)
 * - viewer: Read-only access
 * 
 * These utilities are used throughout the API to enforce consistent
 * permission checks and access control across all workspace resources.
 */

const db = require('../db');

/**
 * Get user's role in a workspace
 * 
 * Queries the database to determine what role (if any) a user has
 * in a specific workspace.
 * 
 * @param {number} workspaceId - The workspace ID
 * @param {number} userId - The user ID
 * @returns {Promise<string|null>} - Returns role ('admin', 'collaborator', 'viewer') or null if no access
 */
async function getUserRole(workspaceId, userId) {
  try {
    const [access] = await db.execute(`
      SELECT role FROM workspace_user 
      WHERE workspace_id = ? AND user_id = ?
    `, [workspaceId, userId]);

    return access.length > 0 ? access[0].role : null;
  } catch (error) {
    console.error('Error getting user role:', error);
    throw error;
  }
}

/**
 * Check if user can perform admin operations (full access)
 * 
 * Admin operations include:
 * - Managing workspace users (add/remove users, change roles)
 * - Deleting or permanently deleting a workspace
 * - All write and read operations
 * 
 * Only users with the 'admin' role can perform these operations.
 * 
 * @param {number} workspaceId - The workspace ID
 * @param {number} userId - The user ID
 * @returns {Promise<{allowed: boolean, message: string}>} - Object with access decision and message
 */
async function canAdmin(workspaceId, userId) {
  const role = await getUserRole(workspaceId, userId);

  if (!role) {
    return { allowed: false, message: 'Access denied to this workspace' };
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
 * - Creating/updating/deleting content within a workspace
 * - Managing accounts, categories, and transactions
 * - Updating workspace settings
 * 
 * Users with either 'admin' or 'collaborator' roles can perform these operations.
 * 
 * @param {number} workspaceId - The workspace ID
 * @param {number} userId - The user ID
 * @returns {Promise<{allowed: boolean, message: string}>} - Object with access decision and message
 */
async function canWrite(workspaceId, userId) {
  const role = await getUserRole(workspaceId, userId);

  if (!role) {
    return { allowed: false, message: 'Access denied to this workspace' };
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
 * - Viewing workspace content
 * - Retrieving accounts, categories, and transactions
 * - Accessing workspace settings
 * 
 * Any user with access to the workspace ('admin', 'collaborator', or 'viewer')
 * can perform these operations.
 * 
 * @param {number} workspaceId - The workspace ID
 * @param {number} userId - The user ID
 * @returns {Promise<{allowed: boolean, message: string}>} - Object with access decision and message
 */
async function canRead(workspaceId, userId) {
  const role = await getUserRole(workspaceId, userId);

  if (!role) {
    return { allowed: false, message: 'Access denied to this workspace' };
  }

  // Role exists and is either 'admin', 'collaborator', or 'viewer'
  return { allowed: true, message: 'Access granted' };
}

/**
 * Get users of a workspace
 * 
 * Retrieves all users who have access to a workspace, along with their
 * roles and basic profile information.
 * 
 * This is typically used in workspace management interfaces and for
 * permission verification.
 * 
 * @param {number} workspaceId - The workspace ID to get users for
 * @returns {Promise<Array>} - Returns array of workspace users with their roles
 * 
 * @example
 * // Returns an array of objects like:
 * // [{ id: 1, username: 'johndoe', role: 'admin', created_at: '2023-01-01' }, ...]
 */
async function getWorkspaceUsers(workspaceId) {
  const [users] = await db.execute(`
    SELECT u.id, u.username, wu.role, u.created_at
    FROM user u
    INNER JOIN workspace_user wu ON u.id = wu.user_id
    WHERE wu.workspace_id = ?
    ORDER BY u.username ASC
  `, [workspaceId]);

  return users;
}

/**
 * Get workspace by ID (excludes deleted workspaces)
 * 
 * Retrieves a workspace's full details by its ID. Only returns
 * active workspaces (not soft-deleted ones).
 * 
 * This function is commonly used to verify workspace existence
 * and to retrieve workspace settings.
 * 
 * @param {number} workspaceId - The workspace ID to get
 * @returns {Promise<Object|null>} - Returns workspace object or null if not found/deleted
 * 
 * @example
 * // Returns an object like:
 * // { id: 1, name: 'Personal Finance', description: '...', created_at: '2023-01-01', ... }
 */
async function getWorkspaceById(workspaceId) {
  const [workspaces] = await db.execute(
    'SELECT * FROM workspace WHERE id = ? AND deleted_at IS NULL',
    [workspaceId]
  );

  return workspaces[0] || null;
}

/**
 * Get workspace by ID (includes deleted workspaces)
 * 
 * Retrieves a workspace's full details by its ID, including soft-deleted ones.
 * This is primarily used for restore operations and admin functions.
 * 
 * @param {number} workspaceId - The workspace ID to get
 * @returns {Promise<Object|null>} - Returns workspace object or null if not found
 */
async function getWorkspaceByIdIncludingDeleted(workspaceId) {
  const [workspaces] = await db.execute(
    'SELECT * FROM workspace WHERE id = ?',
    [workspaceId]
  );

  return workspaces[0] || null;
}

/**
 * Function exports
 * 
 * These utility functions enable consistent permission checking across the API.
 * They should be used in all routes that access workspace resources to ensure
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
  getWorkspaceUsers,
  getWorkspaceById,
  getWorkspaceByIdIncludingDeleted
};