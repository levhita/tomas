import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useUsersStore = defineStore('users', () => {
  // State
  const currentUser = ref(null);
  const token = ref(null);
  const users = ref([]); // List of all users (for admin)
  const isLoadingUsers = ref(false); // Loading state for users list

  // Getters
  const isAuthenticated = computed(() => !!token.value && !!currentUser.value);
  const isSuperAdmin = computed(() => currentUser.value?.superadmin || false);
  const userStats = computed(() => {
    const total = users.value.length;
    const superAdmins = users.value.filter(user => user.superadmin).length;
    const regularUsers = total - superAdmins;

    // Workspace statistics
    const totalWorkspaceAccess = users.value.reduce((sum, user) => sum + (user.workspace_count || 0), 0);
    const usersWithWorkspaceAccess = users.value.filter(user => (user.workspace_count || 0) > 0).length;
    const usersWithoutWorkspaceAccess = total - usersWithWorkspaceAccess;

    return {
      total,
      superAdmins,
      regularUsers,
      totalWorkspaceAccess,
      usersWithWorkspaceAccess,
      usersWithoutWorkspaceAccess,
      averageWorkspacesPerUser: total > 0 ? (totalWorkspaceAccess / total).toFixed(1) : 0
    };
  });

  // Actions
  async function login(username, password) {
    try {
      const response = await fetch('/api/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      const data = await response.json();
      token.value = data.token;
      currentUser.value = data.user;

      // Store token in localStorage
      localStorage.setItem('token', data.token);

      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Fetch current user details using the stored token
  async function fetchCurrentUser() {
    try {
      if (!token.value) {
        throw new Error('No token available');
      }

      const response = await fetch('/api/users/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token.value}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // Token is invalid/expired
          throw new Error('Token expired');
        }
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch user information');
      }

      const userData = await response.json();
      currentUser.value = userData;

      return userData;
    } catch (error) {
      console.error('Fetch user error:', error);
      // If fetching user fails, clear the invalid token
      await logout();
      throw error;
    }
  }

  // Initialize user from stored token
  async function initializeFromToken() {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      token.value = storedToken;
      try {
        // Fetch current user details to validate token and get user info
        await fetchCurrentUser();
        return true;
      } catch (error) {
        // Token is invalid, clear it
        await logout();
        return false;
      }
    }
    return false;
  }

  async function logout() {
    currentUser.value = null;
    token.value = null;
    users.value = [];
    localStorage.removeItem('token');
  }

  // Admin functions for user management

  /**
   * Fetch all users - Super admin only
   * @returns {Promise<Array>} List of all users
   */
  async function fetchAllUsers() {
    if (!isSuperAdmin.value) {
      throw new Error('Unauthorized: Super admin access required');
    }

    isLoadingUsers.value = true;
    try {
      const response = await fetch('/api/users', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token.value}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch users');
      }

      const userData = await response.json();
      users.value = userData;
      return userData;
    } catch (error) {
      console.error('Fetch users error:', error);
      throw error;
    } finally {
      isLoadingUsers.value = false;
    }
  }

  /**
   * Create a new user - Super admin only
   * @param {Object} userData - User data
   * @param {string} userData.username - Username
   * @param {string} userData.password - Password
   * @param {boolean} userData.superadmin - Super admin flag
   * @returns {Promise<Object>} Created user data
   */
  async function createUser(userData) {
    if (!isSuperAdmin.value) {
      throw new Error('Unauthorized: Super admin access required');
    }

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token.value}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create user');
      }

      const newUser = await response.json();

      // Add the new user to the local users array
      users.value.push(newUser);

      return newUser;
    } catch (error) {
      console.error('Create user error:', error);
      throw error;
    }
  }

  /**
   * Update a user - Super admin only (or own account)
   * @param {number} userId - User ID to update
   * @param {Object} userData - Updated user data
   * @returns {Promise<Object>} Updated user data
   */
  async function updateUser(userId, userData) {
    const isOwnAccount = currentUser.value?.id === userId;

    if (!isSuperAdmin.value && !isOwnAccount) {
      throw new Error('Unauthorized: Can only update own account or super admin access required');
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token.value}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user');
      }

      const updatedUser = await response.json();

      // Update the user in the local users array
      const userIndex = users.value.findIndex(user => user.id === userId);
      if (userIndex !== -1) {
        users.value[userIndex] = updatedUser;
      }

      // If updating current user, update currentUser as well
      if (isOwnAccount) {
        currentUser.value = updatedUser;
      }

      return updatedUser;
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  }

  /**
   * Delete a user - Super admin only
   * @param {number} userId - User ID to delete
   * @returns {Promise<void>}
   */
  async function deleteUser(userId) {
    if (!isSuperAdmin.value) {
      throw new Error('Unauthorized: Super admin access required');
    }

    if (currentUser.value?.id === userId) {
      throw new Error('Cannot delete your own account');
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token.value}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete user');
      }

      // Remove the user from the local users array
      users.value = users.value.filter(user => user.id !== userId);

      return true;
    } catch (error) {
      console.error('Delete user error:', error);
      throw error;
    }
  }

  /**
   * Get a specific user by ID - Super admin only
   * @param {number} userId - User ID
   * @returns {Promise<Object>} User data
   */
  async function getUserById(userId) {
    if (!isSuperAdmin.value) {
      throw new Error('Unauthorized: Super admin access required');
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token.value}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch user');
      }

      const userData = await response.json();
      return userData;
    } catch (error) {
      console.error('Get user error:', error);
      throw error;
    }
  }

  /**
   * Search workspaces by name or ID - Super admin only
   * @param {string} query - Search query (workspace name or ID)
   * @param {number} limit - Maximum results to return (default: 10)
   * @returns {Promise<Array>} List of matching workspaces
   */
  async function searchWorkspaces(query, limit = 10) {
    if (!isSuperAdmin.value) {
      throw new Error('Unauthorized: Super admin access required');
    }

    if (!query || query.trim().length === 0) {
      return [];
    }

    try {
      const params = new URLSearchParams({
        q: query.trim(),
        limit: limit.toString()
      });

      const response = await fetch(`/api/workspaces/search?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token.value}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to search workspaces');
      }

      const workspaces = await response.json();
      return workspaces;
    } catch (error) {
      console.error('Search workspaces error:', error);
      throw error;
    }
  }

  /**
   * Fetch all workspaces - Super admin only
   * @deprecated Use searchWorkspaces instead for better performance
   * @returns {Promise<Array>} List of all workspaces
   */
  async function fetchAllWorkspaces() {
    if (!isSuperAdmin.value) {
      throw new Error('Unauthorized: Super admin access required');
    }

    try {
      const response = await fetch('/api/workspaces/all', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token.value}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch all workspaces');
      }

      const workspaces = await response.json();
      return workspaces;
    } catch (error) {
      console.error('Fetch all workspaces error:', error);
      throw error;
    }
  }

  /**
   * Get workspace access for a specific user - Super admin only
   * @param {number} userId - User ID
   * @returns {Promise<Array>} List of workspaces the user has access to
   */
  async function getUserWorkspaces(userId) {
    if (!isSuperAdmin.value) {
      throw new Error('Unauthorized: Super admin access required');
    }

    try {
      const response = await fetch(`/api/users/${userId}/workspaces`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token.value}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch user workspaces');
      }

      const workspaces = await response.json();
      return workspaces;
    } catch (error) {
      console.error('Get user workspaces error:', error);
      throw error;
    }
  }

  /**
   * Add user to a workspace - Super admin only
   * @param {number} userId - User ID
   * @param {number} workspaceId - Workspace ID
   * @param {string} role - Role to assign (admin, collaborator, viewer)
   * @returns {Promise<Array>} Updated list of user's workspaces
   */
  async function addUserToWorkspace(userId, workspaceId, role) {
    if (!isSuperAdmin.value) {
      throw new Error('Unauthorized: Super admin access required');
    }

    try {
      const response = await fetch(`/api/users/${userId}/workspaces`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token.value}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ workspaceId, role }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add user to workspace');
      }

      const workspaces = await response.json();
      return workspaces;
    } catch (error) {
      console.error('Add user to workspace error:', error);
      throw error;
    }
  }

  /**
   * Update user's role in a workspace - Super admin only
   * @param {number} userId - User ID
   * @param {number} workspaceId - Workspace ID
   * @param {string} role - New role (admin, collaborator, viewer)
   * @returns {Promise<Array>} Updated list of user's workspaces
   */
  async function updateUserWorkspaceRole(userId, workspaceId, role) {
    if (!isSuperAdmin.value) {
      throw new Error('Unauthorized: Super admin access required');
    }

    try {
      const response = await fetch(`/api/users/${userId}/workspaces/${workspaceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token.value}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user workspace role');
      }

      const workspaces = await response.json();
      return workspaces;
    } catch (error) {
      console.error('Update user workspace role error:', error);
      throw error;
    }
  }

  /**
   * Remove user from a workspace - Super admin only
   * @param {number} userId - User ID
   * @param {number} workspaceId - Workspace ID
   * @returns {Promise<Array>} Updated list of user's workspaces
   */
  async function removeUserFromWorkspace(userId, workspaceId) {
    if (!isSuperAdmin.value) {
      throw new Error('Unauthorized: Super admin access required');
    }

    try {
      const response = await fetch(`/api/users/${userId}/workspaces/${workspaceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token.value}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove user from workspace');
      }

      const workspaces = await response.json();
      return workspaces;
    } catch (error) {
      console.error('Remove user from workspace error:', error);
      throw error;
    }
  }

  return {
    // State
    currentUser,
    token,
    users,
    isLoadingUsers,
    // Getters
    isAuthenticated,
    isSuperAdmin,
    userStats,
    // Actions
    login,
    logout,
    fetchCurrentUser,
    initializeFromToken,
    // Admin actions
    fetchAllUsers,
    createUser,
    updateUser,
    deleteUser,
    getUserById,
    // Workspace management
    searchWorkspaces,
    fetchAllWorkspaces,
    getUserWorkspaces,
    addUserToWorkspace,
    updateUserWorkspaceRole,
    removeUserFromWorkspace
  };
});