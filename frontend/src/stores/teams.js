import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useUsersStore } from './users';

export const useTeamsStore = defineStore('teams', () => {
  // State
  const teams = ref([]);
  const isLoadingTeams = ref(false);
  const currentTeam = ref(null);
  const currentTeamBooks = ref([]);
  const currentTeamUsers = ref([]);
  
  // Get the users store for authentication
  const usersStore = useUsersStore();
  
  // Computed properties
  const teamStats = computed(() => {
    const total = teams.value.length;
    const activeTeams = teams.value.filter(team => !team.deleted_at).length;
    const deletedTeams = total - activeTeams;
    
    // User statistics
    const teamsWithUsers = teams.value.filter(team => team.user_count > 0).length;
    
    return {
      total,
      activeTeams,
      deletedTeams,
      teamsWithUsers,
      averageUsersPerTeam: total > 0 ? 
        (teams.value.reduce((sum, team) => sum + (team.user_count || 0), 0) / total).toFixed(1) : 0
    };
  });

  // Books computed properties
  const booksByName = computed(() => {
    return currentTeamBooks.value.sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  });

  const getBookById = computed(() => {
    return (id) => currentTeamBooks.value.find(book => book.id === parseInt(id));
  });
  
  /**
   * Fetch teams - Super admin only
   * @param {Object} options - Fetch options
   * @param {boolean} options.deleted - If true, fetch deleted teams (recycle bin)
   * @returns {Promise<Array>} List of teams
   */
  async function fetchAllTeams(options = {}) {
    if (!usersStore.isSuperAdmin) {
      throw new Error('Unauthorized: Super admin access required');
    }
    
    isLoadingTeams.value = true;
    
    try {
      const url = new URL('/api/teams/all', window.location.origin);
      
      // If deleted=true is specified, fetch only deleted teams (recycle bin)
      if (options.deleted) {
        url.searchParams.append('deleted', 'true');
      }
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${usersStore.token}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch teams');
      }
      
      const data = await response.json();
      teams.value = data;
      return data;
    } catch (error) {
      console.error('Error fetching teams:', error);
      throw error;
    } finally {
      isLoadingTeams.value = false;
    }
  }
  
  /**
   * Fetch deleted teams (recycle bin) - Super admin only
   * @returns {Promise<Array>} List of deleted teams
   */
  async function fetchDeletedTeams() {
    return fetchAllTeams({ deleted: true });
  }
  
  /**
   * Create a new team - Super admin only
   * @param {Object} teamData - Team data
   * @param {string} teamData.name - Team name
   * @returns {Promise<Object>} Created team data
   */
  async function createTeam(teamData) {
    if (!usersStore.isSuperAdmin) {
      throw new Error('Unauthorized: Super admin access required');
    }
    
    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${usersStore.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(teamData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create team');
      }
      
      const newTeam = await response.json();
      
      // Add the new team to the local teams array
      teams.value.push(newTeam);
      
      return newTeam;
    } catch (error) {
      console.error('Create team error:', error);
      throw error;
    }
  }
  
  /**
   * Update a team - Super admin only
   * @param {number} teamId - Team ID
   * @param {Object} teamData - Team data to update
   * @returns {Promise<Object>} Updated team data
   */
  async function updateTeam(teamId, teamData) {
    if (!usersStore.isSuperAdmin) {
      throw new Error('Unauthorized: Super admin access required');
    }
    
    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${usersStore.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(teamData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update team');
      }
      
      const updatedTeam = await response.json();
      
      // Update the team in the local teams array
      const index = teams.value.findIndex(team => team.id === teamId);
      if (index !== -1) {
        teams.value[index] = { ...teams.value[index], ...updatedTeam };
      }
      
      return updatedTeam;
    } catch (error) {
      console.error('Update team error:', error);
      throw error;
    }
  }
  
  /**
   * Delete a team - Super admin only
   * @param {number} teamId - Team ID
   * @returns {Promise<Object>} Deletion result
   */
  async function deleteTeam(teamId) {
    if (!usersStore.isSuperAdmin) {
      throw new Error('Unauthorized: Super admin access required');
    }
    
    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${usersStore.token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete team');
      }
      
      // Remove the team from the local teams array
      teams.value = teams.value.filter(team => team.id !== teamId);
      
      return { success: true };
    } catch (error) {
      console.error('Delete team error:', error);
      throw error;
    }
  }
  
  /**
   * Fetch team users and store them in currentTeamUsers
   * @param {number} teamId - Team ID
   * @returns {Promise<Array>} List of users in the team
   */
  async function fetchTeamUsers(teamId) {
    if (!usersStore.token) {
      throw new Error('Authentication required');
    }
    
    try {
      const response = await fetch(`/api/teams/${teamId}/users`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${usersStore.token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch team users');
      }
      
      const data = await response.json();
      currentTeamUsers.value = data;
      return data;
    } catch (error) {
      console.error('Fetch team users error:', error);
      throw error;
    }
  }
  
  /**
   * Add a user to a team - Super admin only
   * @param {number} teamId - Team ID
   * @param {number} userId - User ID
   * @param {string} role - Role to assign (admin, collaborator, viewer)
   * @returns {Promise<Object>} Updated team data
   */
  async function addUserToTeam(teamId, userId, role) {
    if (!usersStore.isSuperAdmin) {
      throw new Error('Unauthorized: Super admin access required');
    }
    
    try {
      const response = await fetch(`/api/teams/${teamId}/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${usersStore.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, role }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add user to team');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Add user to team error:', error);
      throw error;
    }
  }
  
  /**
   * Update a user's role in a team - Super admin only
   * @param {number} teamId - Team ID
   * @param {number} userId - User ID
   * @param {string} role - New role (admin, collaborator, viewer)
   * @returns {Promise<Object>} Result
   */
  async function updateUserRole(teamId, userId, role) {
    if (!usersStore.isSuperAdmin) {
      throw new Error('Unauthorized: Super admin access required');
    }
    
    try {
      const response = await fetch(`/api/teams/${teamId}/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${usersStore.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user role');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Update user role error:', error);
      throw error;
    }
  }
  
  /**
   * Remove a user from a team - Super admin only
   * @param {number} teamId - Team ID
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Result
   */
  async function removeUserFromTeam(teamId, userId) {
    if (!usersStore.isSuperAdmin) {
      throw new Error('Unauthorized: Super admin access required');
    }
    
    try {
      const response = await fetch(`/api/teams/${teamId}/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${usersStore.token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove user from team');
      }
      
      return { success: true };
    } catch (error) {
      console.error('Remove user from team error:', error);
      throw error;
    }
  }
  
  /**
   * Get team by ID - Super admin only
   * @param {number} teamId - Team ID
   * @returns {Promise<Object>} Team data
   */
  async function getTeamById(teamId) {
    if (!usersStore.isSuperAdmin) {
      throw new Error('Unauthorized: Super admin access required');
    }
    
    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${usersStore.token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch team');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get team error:', error);
      throw error;
    }
  }
  
  /**
   * Restore a soft-deleted team - Super admin only
   * @param {number} teamId - Team ID
   * @returns {Promise<Object>} Restored team data
   */
  async function restoreTeam(teamId) {
    if (!usersStore.isSuperAdmin) {
      throw new Error('Unauthorized: Super admin access required');
    }
    
    try {
      const response = await fetch(`/api/teams/${teamId}/restore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${usersStore.token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to restore team');
      }
      
      const restoredTeam = await response.json();
      
      // Update the team in the local teams array
      const index = teams.value.findIndex(team => team.id === teamId);
      if (index !== -1) {
        teams.value[index] = { ...teams.value[index], ...restoredTeam };
      }
      
      return restoredTeam;
    } catch (error) {
      console.error('Restore team error:', error);
      throw error;
    }
  }
  
  /**
   * Permanently delete a team and all associated data - Super admin only
   * @param {number} teamId - Team ID
   * @returns {Promise<Object>} Deletion result
   */
  async function permanentlyDeleteTeam(teamId) {
    if (!usersStore.isSuperAdmin) {
      throw new Error('Unauthorized: Super admin access required');
    }
    
    try {
      const response = await fetch(`/api/teams/${teamId}/permanent`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${usersStore.token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to permanently delete team');
      }
      
      // Remove the team from the local teams array
      teams.value = teams.value.filter(team => team.id !== teamId);
      
      return { success: true };
    } catch (error) {
      console.error('Permanently delete team error:', error);
      throw error;
    }
  }

  /**
   * Fetch books for a team and store them in currentTeamBooks
   * @param {number} teamId - Team ID
   * @returns {Promise<Array>} List of books in the team
   */
  async function fetchTeamBooks(teamId) {
    if (!usersStore.token) {
      throw new Error('Authentication required');
    }
    
    try {
      const response = await fetch(`/api/teams/${teamId}/books`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${usersStore.token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch team books');
      }
      
      const data = await response.json();
      currentTeamBooks.value = data;
      return data;
    } catch (error) {
      console.error('Fetch team books error:', error);
      throw error;
    }
  }

  return {
    // State
    teams,
    isLoadingTeams,
    currentTeam,
    currentTeamBooks,
    currentTeamUsers,
    
    // Computed
    teamStats,
    booksByName,
    getBookById,
    
    // Actions
    fetchAllTeams,
    fetchDeletedTeams,
    createTeam,
    updateTeam,
    deleteTeam,
    fetchTeamUsers,
    fetchTeamBooks,
    addUserToTeam,
    updateUserRole,
    removeUserFromTeam,
    getTeamById,
    fetchTeam: getTeamById,
    restoreTeam,
    permanentlyDeleteTeam
  };
});
