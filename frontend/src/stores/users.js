import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useUsersStore = defineStore('users', () => {
  // State
  const currentUser = ref(null);
  const token = ref(null);
  const users = ref([]); // List of all users (for admin)
  const isLoadingUsers = ref(false); // Loading state for users list
  const isInitializing = ref(false); // Track initialization state
  const isInitialized = ref(false); // Track if initialization has been attempted

  // Getters
  const isAuthenticated = computed(() => !!token.value && !!currentUser.value);
  const isSuperAdmin = computed(() => {
    const isSuperAdminValue = currentUser.value?.superadmin || false;
    console.log('isSuperAdmin getter called, user:', currentUser.value, 'superadmin:', isSuperAdminValue);
    return isSuperAdminValue;
  });
  const hasSelectedTeam = computed(() => {
    if (!token.value) return false;
    try {
      const payload = JSON.parse(atob(token.value.split('.')[1]));
      return !!payload.teamId;
    } catch {
      return false;
    }
  });
  const selectedTeam = computed(() => {
    if (!token.value) return null;
    try {
      const payload = JSON.parse(atob(token.value.split('.')[1]));
      return payload.teamId ? {
        id: payload.teamId,
        name: payload.teamName,
        role: payload.teamRole
      } : null;
    } catch {
      return null;
    }
  });
  
  // Alias for currentTeam to maintain consistency
  const currentTeam = selectedTeam;
  const userStats = computed(() => {
    const total = users.value.length;
    const superAdmins = users.value.filter(user => user.superadmin).length;
    const regularUsers = total - superAdmins;

    // Book statistics
    const totalBookAccess = users.value.reduce((sum, user) => sum + (user.book_count || 0), 0);
    const usersWithBookAccess = users.value.filter(user => (user.book_count || 0) > 0).length;
    const usersWithoutBookAccess = total - usersWithBookAccess;

    return {
      total,
      superAdmins,
      regularUsers,
      totalBookAccess,
      usersWithBookAccess,
      usersWithoutBookAccess,
      averageBooksPerUser: total > 0 ? (totalBookAccess / total).toFixed(1) : 0
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
    // Prevent multiple simultaneous initialization attempts
    if (isInitializing.value || isInitialized.value) {
      return isAuthenticated.value;
    }

    isInitializing.value = true;

    try {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        token.value = storedToken;
        try {
          // Fetch current user details to validate token and get user info
          await fetchCurrentUser();
          isInitialized.value = true;
          return true;
        } catch (error) {
          // Token is invalid, clear it
          await logout();
          isInitialized.value = true;
          return false;
        }
      }
      isInitialized.value = true;
      return false;
    } finally {
      isInitializing.value = false;
    }
  }

  async function logout() {
    currentUser.value = null;
    token.value = null;
    users.value = [];
    isInitialized.value = false;
    isInitializing.value = false;
    localStorage.removeItem('token');
  }

  // Team-related functions

  /**
   * Fetch current user's teams
   * @returns {Promise<Array>} List of teams the user has access to
   */
  async function fetchUserTeams() {
    try {
      if (!token.value) {
        throw new Error('No token available');
      }

      const response = await fetch('/api/users/me/teams', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token.value}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch teams');
      }

      const teams = await response.json();
      return teams;
    } catch (error) {
      console.error('Error fetching user teams:', error);
      throw error;
    }
  }

  /**
   * Select a team and get a new JWT token with team information
   * @param {number} teamId - The team ID to select
   * @returns {Promise<Object>} New token and team information
   */
  async function selectTeam(teamId) {
    try {
      if (!token.value) {
        throw new Error('No token available');
      }

      const response = await fetch('/api/users/select-team', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token.value}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teamId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to select team');
      }

      const data = await response.json();
      
      // Update the token with the new one that includes team information
      token.value = data.token;
      localStorage.setItem('token', data.token);

      return data;
    } catch (error) {
      console.error('Error selecting team:', error);
      throw error;
    }
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
   * Search books by name or ID - Super admin only
   * @param {string} query - Search query (book name or ID)
   * @param {number} limit - Maximum results to return (default: 10)
   * @returns {Promise<Array>} List of matching books
   */
  async function searchBooks(query, limit = 10) {
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

      const response = await fetch(`/api/books/search?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token.value}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to search books');
      }

      const books = await response.json();
      return books;
    } catch (error) {
      console.error('Search books error:', error);
      throw error;
    }
  }

  /**
   * Fetch all books - Super admin only
   * @deprecated Use searchBooks instead for better performance
   * @returns {Promise<Array>} List of all books
   */
  async function fetchAllBooks() {
    if (!isSuperAdmin.value) {
      throw new Error('Unauthorized: Super admin access required');
    }

    try {
      const response = await fetch('/api/books/all', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token.value}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch all books');
      }

      const books = await response.json();
      return books;
    } catch (error) {
      console.error('Fetch all books error:', error);
      throw error;
    }
  }

  /**
   * Get book access for a specific user - Super admin only
   * @param {number} userId - User ID
   * @returns {Promise<Array>} List of books the user has access to
   */
  async function getUserBooks(userId) {
    if (!isSuperAdmin.value) {
      throw new Error('Unauthorized: Super admin access required');
    }

    try {
      const response = await fetch(`/api/users/${userId}/books`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token.value}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch user books');
      }

      const books = await response.json();
      return books;
    } catch (error) {
      console.error('Get user books error:', error);
      throw error;
    }
  }

  /**
   * Add user to a book - Super admin only
   * @param {number} userId - User ID
   * @param {number} bookId - Book ID
   * @param {string} role - Role to assign (admin, collaborator, viewer)
   * @returns {Promise<Array>} Updated list of user's books
   */
  async function addUserToBook(userId, bookId, role) {
    if (!isSuperAdmin.value) {
      throw new Error('Unauthorized: Super admin access required');
    }

    try {
      const response = await fetch(`/api/users/${userId}/books`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token.value}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookId, role }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add user to book');
      }

      const books = await response.json();
      return books;
    } catch (error) {
      console.error('Add user to book error:', error);
      throw error;
    }
  }

  /**
   * Update user's role in a book - Super admin only
   * @param {number} userId - User ID
   * @param {number} bookId - Book ID
   * @param {string} role - New role (admin, collaborator, viewer)
   * @returns {Promise<Array>} Updated list of user's books
   */
  async function updateUserBookRole(userId, bookId, role) {
    if (!isSuperAdmin.value) {
      throw new Error('Unauthorized: Super admin access required');
    }

    try {
      const response = await fetch(`/api/users/${userId}/books/${bookId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token.value}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user book role');
      }

      const books = await response.json();
      return books;
    } catch (error) {
      console.error('Update user book role error:', error);
      throw error;
    }
  }

  /**
   * Remove user from a book - Super admin only
   * @param {number} userId - User ID
   * @param {number} bookId - Book ID
   * @returns {Promise<Array>} Updated list of user's books
   */
  async function removeUserFromBook(userId, bookId) {
    if (!isSuperAdmin.value) {
      throw new Error('Unauthorized: Super admin access required');
    }

    try {
      const response = await fetch(`/api/users/${userId}/books/${bookId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token.value}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove user from book');
      }

      const books = await response.json();
      return books;
    } catch (error) {
      console.error('Remove user from book error:', error);
      throw error;
    }
  }

  /**
   * Enable a user - Super admin only
   * @param {number} userId - User ID to enable
   * @returns {Promise<Object>} Updated user data
   */
  async function enableUser(userId) {
    if (!isSuperAdmin.value) {
      throw new Error('Unauthorized: Super admin access required');
    }

    try {
      const response = await fetch(`/api/users/${userId}/enable`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token.value}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to enable user');
      }

      const userData = await response.json();

      // Update the user in the local store
      const userIndex = users.value.findIndex(user => user.id === userId);
      if (userIndex !== -1) {
        users.value[userIndex] = { ...users.value[userIndex], ...userData };
      }

      return userData;
    } catch (error) {
      console.error('Enable user error:', error);
      throw error;
    }
  }

  /**
   * Disable a user - Super admin only
   * @param {number} userId - User ID to disable
   * @returns {Promise<Object>} Updated user data
   */
  async function disableUser(userId) {
    if (!isSuperAdmin.value) {
      throw new Error('Unauthorized: Super admin access required');
    }

    try {
      const response = await fetch(`/api/users/${userId}/disable`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token.value}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to disable user');
      }

      const userData = await response.json();

      // Update the user in the local store
      const userIndex = users.value.findIndex(user => user.id === userId);
      if (userIndex !== -1) {
        users.value[userIndex] = { ...users.value[userIndex], ...userData };
      }

      return userData;
    } catch (error) {
      console.error('Disable user error:', error);
      throw error;
    }
  }

  /**
   * Fetch user's teams
   */
  async function fetchUserTeams() {
    try {
      if (!token.value) {
        throw new Error('No token available');
      }

      const response = await fetch('/api/users/me/teams', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token.value}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Token expired');
        }
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch teams');
      }

      const teams = await response.json();
      return teams;
    } catch (error) {
      console.error('Fetch teams error:', error);
      throw error;
    }
  }

  /**
   * Select a team and get new token with team information
   * @param {number} teamId - Team ID to select
   */
  async function selectTeam(teamId) {
    try {
      if (!token.value) {
        throw new Error('No token available');
      }

      const response = await fetch('/api/users/select-team', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token.value}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teamId }),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Access denied');
        }
        const error = await response.json();
        throw new Error(error.error || 'Failed to select team');
      }

      const data = await response.json();
      
      // Update token with new team information
      token.value = data.token;
      localStorage.setItem('token', data.token);

      // Update current user with team information
      if (currentUser.value) {
        currentUser.value.selectedTeam = data.team;
      }

      return data;
    } catch (error) {
      console.error('Select team error:', error);
      throw error;
    }
  }

  return {
    // State
    currentUser,
    token,
    users,
    isLoadingUsers,
    isInitializing,
    isInitialized,
    // Getters
    isAuthenticated,
    isSuperAdmin,
    hasSelectedTeam,
    selectedTeam,
    currentTeam,
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
    enableUser,
    disableUser,
    getUserById,
    // Book management
    searchBooks,
    fetchAllBooks,
    getUserBooks,
    addUserToBook,
    updateUserBookRole,
    removeUserFromBook,
    // Team management
    fetchUserTeams,
    selectTeam
  };
});