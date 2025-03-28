const db = require('../db');

/**
 * Check if a user has access to a workspace
 * @param {number|string} workspaceId - The workspace ID to check access for
 * @param {number|string} userId - The user ID to check access for
 * @returns {Promise<{hasAccess: boolean, role: string|null}>} - Returns access info and role
 */
async function checkWorkspaceAccess(workspaceId, userId) {
  try {
    const [access] = await db.query(`
      SELECT role FROM workspace_user 
      WHERE workspace_id = ? AND user_id = ?
    `, [workspaceId, userId]);

    if (access.length > 0) {
      return {
        hasAccess: true,
        role: access[0].role
      };
    } else {
      return {
        hasAccess: false,
        role: null
      };
    }
  } catch (error) {
    console.error('Error checking workspace access:', error);
    return {
      hasAccess: false,
      role: null
    };
  }
}

/**
 * Check if a user is owner of a workspace
 * @param {number|string} workspaceId - The workspace ID to check ownership for
 * @param {number|string} userId - The user ID to check
 * @returns {Promise<boolean>} - Returns true if user is owner, false otherwise
 */
async function checkWorkspaceOwner(workspaceId, userId) {
  try {
    const [access] = await db.query(`
      SELECT 1 FROM workspace_user 
      WHERE workspace_id = ? AND user_id = ? AND role = 'owner'
    `, [workspaceId, userId]);

    return access.length > 0;
  } catch (error) {
    console.error('Error checking workspace ownership:', error);
    return false;
  }
}

/**
 * Checks if user has permission to make changes to a workspace
 * @param {number|string} workspaceId - The workspace ID to check
 * @param {number|string} userId - The user ID to check
 * @param {boolean} requireOwner - If true, requires owner role
 * @returns {Promise<{allowed: boolean, status: number, message: string}>} - Returns permission info
 */
async function checkWorkspacePermission(workspaceId, userId, requireOwner = false) {
  try {
    const { hasAccess, role } = await checkWorkspaceAccess(workspaceId, userId);

    if (!hasAccess) {
      return {
        allowed: false,
        status: 403,
        message: 'Access denied to this workspace'
      };
    }

    if (requireOwner && role !== 'owner') {
      return {
        allowed: false,
        status: 403,
        message: 'Only workspace owners can perform this action'
      };
    }

    return {
      allowed: true,
      status: 200,
      message: 'Access granted'
    };
  } catch (error) {
    console.error('Error checking workspace permissions:', error);
    return {
      allowed: false,
      status: 500,
      message: 'Internal server error while checking permissions'
    };
  }
}

/**
 * Verify user has permission to delete items in a workspace
 * @param {number|string} workspaceId - The workspace ID
 * @param {number|string} userId - The user ID
 * @returns {Promise<{allowed: boolean, status: number, message: string}>} - Returns permission info
 */
async function checkDeletePermission(workspaceId, userId) {
  return checkWorkspacePermission(workspaceId, userId, true);
}

/**
 * Get users of a workspace
 * @param {number|string} workspaceId - The workspace ID to get users for
 * @returns {Promise<Array>} - Returns array of workspace users
 */
async function getWorkspaceUsers(workspaceId) {
  const [users] = await db.query(`
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
 * @param {number|string} workspaceId - The workspace ID to get
 * @returns {Promise<Object|null>} - Returns workspace object or null if not found
 */
async function getWorkspaceById(workspaceId) {
  const [workspaces] = await db.query(
    'SELECT * FROM workspace WHERE id = ? AND deleted_at IS NULL',
    [workspaceId]
  );

  return workspaces[0] || null;
}

module.exports = {
  checkWorkspaceAccess,
  checkWorkspaceOwner,
  checkWorkspacePermission,
  checkDeletePermission,
  getWorkspaceUsers,
  getWorkspaceById
};