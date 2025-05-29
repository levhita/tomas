import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useUsersStore = defineStore('users', () => {
  // State
  const currentUser = ref(null);
  const token = ref(null);

  // Getters
  const isAuthenticated = computed(() => !!token.value && !!currentUser.value);
  const isSuperAdmin = computed(() => currentUser.value?.superadmin || false);

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
    localStorage.removeItem('token');
  }

  return {
    // State
    currentUser,
    token,
    // Getters
    isAuthenticated,
    isSuperAdmin,
    // Actions
    login,
    logout,
    fetchCurrentUser,
    initializeFromToken
  };
});