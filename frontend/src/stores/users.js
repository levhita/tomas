import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useUsersStore = defineStore('users', () => {
  // State
  const currentUser = ref(null);
  const token = ref(null);

  // Getters
  const isAuthenticated = computed(() => !!token.value);

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
      currentUser.value = data.user;
      token.value = data.token;

      // Store token in localStorage
      localStorage.setItem('token', data.token);

      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
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
    // Actions
    login,
    logout
  };
});