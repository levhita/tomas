import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useUsersStore } from './users';

export const useAdminStore = defineStore('admin', () => {
  // State
  const dashboardStats = ref(null);
  const isLoadingStats = ref(false);
  const statsError = ref(null);
  
  // Health status state
  const healthStatus = ref('loading');
  const healthData = ref({});
  const healthError = ref(null);

  // Getters
  const hasStats = computed(() => !!dashboardStats.value);

  // Actions

  /**
   * Fetch dashboard statistics
   * @returns {Promise<Object>} Dashboard statistics
   */
  async function fetchDashboardStats() {
    const usersStore = useUsersStore();
    
    if (!usersStore.isSuperAdmin) {
      throw new Error('Unauthorized: Super admin access required');
    }

    isLoadingStats.value = true;
    statsError.value = null;

    try {
      const response = await fetch('/api/health/stats', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${usersStore.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.status}`);
      }

      const stats = await response.json();
      dashboardStats.value = stats;
      return stats;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      statsError.value = error.message;
      throw error;
    } finally {
      isLoadingStats.value = false;
    }
  }

  /**
   * Clear dashboard stats (useful when logging out or switching contexts)
   */
  function clearStats() {
    dashboardStats.value = null;
    statsError.value = null;
  }

  /**
   * Fetch system health status
   * @returns {Promise<Object>} Health status data
   */
  async function fetchHealthStatus() {
    const usersStore = useUsersStore();
    
    if (!usersStore.isSuperAdmin) {
      throw new Error('Unauthorized: Super admin access required');
    }

    healthStatus.value = 'loading';
    healthError.value = null;

    try {
      const response = await fetch('/api/health/admin', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${usersStore.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      const data = await response.json();
      healthData.value = data;
      healthStatus.value = data.status || 'unknown';
      return data;
    } catch (error) {
      console.error('Error loading health status:', error);
      healthStatus.value = 'unhealthy';
      healthError.value = error.message;
      throw error;
    }
  }

  /**
   * Clear health status (useful when logging out or switching contexts)
   */
  function clearHealthStatus() {
    healthStatus.value = 'loading';
    healthData.value = {};
    healthError.value = null;
  }

  return {
    // State
    dashboardStats,
    isLoadingStats,
    statsError,
    healthStatus,
    healthData,
    healthError,
    // Getters
    hasStats,
    // Actions
    fetchDashboardStats,
    clearStats,
    fetchHealthStatus,
    clearHealthStatus
  };
});
