const db = require('../db');


/**
 * Get user's role in a workspace
 * @param {number} workspaceId - The workspace ID
 * @param {number} userId - The user ID
 * @returns {Promise<string|null>} - Returns role or null if no access
 */
async function getUserRole(workspaceId, userId) {
  try {
    const [access] = await db.query(`
      SELECT role FROM workspace_user 
      WHERE workspace_id = ? AND user_id = ?
    `, [workspaceId, userId]);

    return access.length > 0 ? access[0].role : null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}

/**
 * Check if user can perform admin operations (full access)
 * @param {number} workspaceId - The workspace ID
 * @param {number} userId - The user ID
 * @returns {Promise<{allowed: boolean, message: string}>}
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
 * @param {number} workspaceId - The workspace ID
 * @param {number} userId - The user ID
 * @returns {Promise<{allowed: boolean, message: string}>}
 */
async function canWrite(workspaceId, userId) {
  const role = await getUserRole(workspaceId, userId);

  if (!role) {
    return { allowed: false, message: 'Access denied to this workspace' };
  }

  if (role === 'viewer') {
    return { allowed: false, message: 'Write access required for this operation' };
  }

  // Role exists and is either 'admin' or 'contributor'
  return { allowed: true, message: 'Access granted' };
}

/**
 * Check if user can perform read operations
 * @param {number} workspaceId - The workspace ID
 * @param {number} userId - The user ID
 * @returns {Promise<{allowed: boolean, message: string}>}
 */
async function canRead(workspaceId, userId) {
  const role = await getUserRole(workspaceId, userId);

  if (!role) {
    return { allowed: false, message: 'Access denied to this workspace' };
  }

  // Role exists and is either 'admin', 'contributor', or 'viewer'
  return { allowed: true, message: 'Access granted' };
}

/**
 * Get users of a workspace
 * @param {number} workspaceId - The workspace ID to get users for
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
 * @param {number} workspaceId - The workspace ID to get
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
  canAdmin,
  canWrite,
  canRead,
  getWorkspaceUsers,
  getWorkspaceById
};