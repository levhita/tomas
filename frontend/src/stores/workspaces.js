import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import fetchWithAuth from '../utils/fetch';
import { useAccountsStore } from './accounts';
import { useCategoriesStore } from './categories';
import { useTransactionsStore } from './transactions';
import { useUsersStore } from './users';

export const useWorkspacesStore = defineStore('workspaces', () => {
  // State
  const workspaces = ref([]);
  const currentWorkspace = ref(null);
  const isLoading = ref(false);
  const error = ref(null);
  const currentWorkspaceUsers = ref([]);

  // Getters
  const workspacesByName = computed(() => {
    return workspaces.value.sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  });

  const getWorkspaceById = computed(() => {
    return (id) => workspaces.value.find(w => w.id === parseInt(id));
  });

  // Permission-related getters
  const hasAdminPermission = computed(() => {
    if (!currentWorkspace.value) return false;

    const usersStore = useUsersStore();
    const currentUser = usersStore.currentUser;

    // Check if user has admin role in this workspace
    const userEntry = currentWorkspaceUsers.value.find(
      entry => entry.id === currentUser?.id
    );

    return userEntry?.role === 'admin';
  });

  // General write permission - for users who can edit (admin or collaborator)
  // This determines if user can add/edit categories and transactions
  const hasWritePermission = computed(() => {
    if (!currentWorkspace.value) return false;

    const usersStore = useUsersStore();
    const currentUser = usersStore.currentUser;

    // Admin in this workspace has write permissions
    if (hasAdminPermission.value) return true;

    // Check if user has collaborator role in this workspace
    const userEntry = currentWorkspaceUsers.value.find(
      entry => entry.id === currentUser?.id
    );

    return userEntry?.role === 'admin' || userEntry?.role === 'collaborator';
  });

  // Actions
  async function fetchWorkspaces() {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await fetchWithAuth('/api/workspaces');
      const data = await response.json();
      workspaces.value = data;

      // Set current workspace if none is selected
      if (!currentWorkspace.value && data.length > 0) {
        currentWorkspace.value = data[0];
      }

      return data;
    } catch (err) {
      console.error('Error fetching workspaces:', err);
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchWorkspaceById(id) {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await fetchWithAuth(`/api/workspaces/${id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch workspace');
      }

      const workspace = await response.json();

      // Update in list if exists
      const index = workspaces.value.findIndex(w => w.id === parseInt(id));
      if (index !== -1) {
        workspaces.value[index] = workspace;
      } else {
        workspaces.value.push(workspace);
      }

      return workspace;
    } catch (err) {
      console.error('Error fetching workspace:', err);
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function createWorkspace(data) {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await fetchWithAuth('/api/workspaces', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create workspace');
      }

      const newWorkspace = await response.json();
      workspaces.value.push(newWorkspace);
      return newWorkspace;
    } catch (err) {
      console.error('Error creating workspace:', err);
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function updateWorkspace(id, updates) {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await fetchWithAuth(`/api/workspaces/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update workspace');
      }

      const updatedWorkspace = await response.json();
      const index = workspaces.value.findIndex(w => w.id === parseInt(id));
      if (index !== -1) {
        workspaces.value[index] = updatedWorkspace;
      }

      // Update current workspace if it's the one being edited
      if (currentWorkspace.value && currentWorkspace.value.id === parseInt(id)) {
        currentWorkspace.value = updatedWorkspace;
      }

      return updatedWorkspace;
    } catch (err) {
      console.error('Error updating workspace:', err);
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function deleteWorkspace(id) {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await fetchWithAuth(`/api/workspaces/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete workspace');
      }

      const index = workspaces.value.findIndex(w => w.id === parseInt(id));
      if (index !== -1) {
        workspaces.value.splice(index, 1);
      }

      // Reset current workspace if it's the one being deleted
      if (currentWorkspace.value && currentWorkspace.value.id === parseInt(id)) {
        currentWorkspace.value = workspaces.value.length > 0 ? workspaces.value[0] : null;
      }
    } catch (err) {
      console.error('Error deleting workspace:', err);
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function restoreWorkspace(id) {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await fetchWithAuth(`/api/workspaces/${id}/restore`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to restore workspace');
      }

      const restoredWorkspace = await response.json();
      workspaces.value.push(restoredWorkspace);
      return restoredWorkspace;
    } catch (err) {
      console.error('Error restoring workspace:', err);
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function getWorkspaceUsers(id) {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await fetchWithAuth(`/api/workspaces/${id}/users`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch workspace users');
      }

      const users = await response.json();

      // If this is for the current workspace, update the users list
      if (currentWorkspace.value && currentWorkspace.value.id === parseInt(id)) {
        currentWorkspaceUsers.value = users;
      }

      return users;
    } catch (err) {
      console.error('Error fetching workspace users:', err);
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function addUserToWorkspace(workspaceId, userId) {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await fetchWithAuth(`/api/workspaces/${workspaceId}/users`, {
        method: 'POST',
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add user to workspace');
      }

      const updatedUsers = await response.json();

      // Update workspace users if it's the current workspace
      if (currentWorkspace.value && currentWorkspace.value.id === parseInt(workspaceId)) {
        currentWorkspace.value = {
          ...currentWorkspace.value,
          users: updatedUsers
        };
      }

      return updatedUsers;
    } catch (err) {
      console.error('Error adding user to workspace:', err);
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function removeUserFromWorkspace(workspaceId, userId) {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await fetchWithAuth(`/api/workspaces/${workspaceId}/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove user from workspace');
      }

      // Update workspace users if it's the current workspace
      if (currentWorkspace.value && currentWorkspace.value.id === parseInt(workspaceId)) {
        const updatedUsers = currentWorkspace.value.users.filter(
          user => user.id !== parseInt(userId)
        );

        currentWorkspace.value = {
          ...currentWorkspace.value,
          users: updatedUsers
        };
      }
    } catch (err) {
      console.error('Error removing user from workspace:', err);
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  // Enhanced method for setting current workspace and loading all dependent data
  async function setCurrentWorkspaceAndLoadData(workspace) {
    // Reset all stores first to clear previous workspace data
    resetWorkspaceData();

    // Set current workspace
    currentWorkspace.value = workspace;

    // Return early if no workspace was provided
    if (!workspace) return null;

    // Load all dependent data for this workspace
    isLoading.value = true;
    error.value = null;

    try {
      // Get stores
      const accountsStore = useAccountsStore();
      const categoriesStore = useCategoriesStore();

      // Load workspace users for permission checks
      currentWorkspaceUsers.value = await getWorkspaceUsers(workspace.id);

      // Load data in parallel
      await Promise.all([
        accountsStore.fetchAccounts(workspace.id),
        categoriesStore.fetchCategories(workspace.id)
      ]);

      return workspace;
    } catch (err) {
      console.error('Error loading workspace data:', err);
      error.value = 'Failed to load workspace data: ' + err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  // Function to reset all workspace-related data
  function resetWorkspaceData() {
    const accountsStore = useAccountsStore();
    const categoriesStore = useCategoriesStore();
    const transactionsStore = useTransactionsStore();

    // Reset each store
    accountsStore.resetState();
    categoriesStore.resetState();
    transactionsStore.resetState();
  }

  // Validates workspace ID and loads the workspace with all related data
  async function validateAndLoadWorkspace(workspaceId) {
    isLoading.value = true;
    error.value = null;

    try {
      // Ensure workspaces are loaded
      if (workspaces.value.length === 0) {
        await fetchWorkspaces();
      }

      // Find the workspace
      const workspace = getWorkspaceById.value(workspaceId);

      // If workspace doesn't exist
      if (!workspace) {
        error.value = 'Workspace not found';
        return { success: false, error: 'invalid-workspace' };
      }

      // Load the workspace and all its data
      await setCurrentWorkspaceAndLoadData(workspace);

      return { success: true, workspace };
    } catch (err) {
      console.error('Error validating workspace:', err);
      error.value = err.message;
      return { success: false, error: 'workspace-error' };
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Saves workspace data (create or update based on presence of ID)
   * @param {Object} workspaceData - Workspace data to save
   * @returns {Promise<Object>} The saved workspace
   */
  async function saveWorkspace(workspaceData) {
    try {
      isLoading.value = true;
      error.value = null;

      let savedWorkspace;
      if (workspaceData.id) {
        // Update existing workspace
        savedWorkspace = await updateWorkspace(workspaceData.id, {
          name: workspaceData.name,
          note: workspaceData.note,
          currency_symbol: workspaceData.currency_symbol,
          week_start: workspaceData.week_start
        });
      } else {
        // Create new workspace
        savedWorkspace = await createWorkspace({
          name: workspaceData.name,
          note: workspaceData.note,
          currency_symbol: workspaceData.currency_symbol,
          week_start: workspaceData.week_start
        });
      }

      return savedWorkspace;
    } catch (error) {
      error.value = error.message;
      throw error;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    // State
    workspaces,
    currentWorkspace,
    isLoading,
    error,

    // Getters
    workspacesByName,
    getWorkspaceById,
    hasAdminPermission,
    hasWritePermission,

    // Actions
    fetchWorkspaces,
    fetchWorkspaceById,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    restoreWorkspace,
    getWorkspaceUsers,
    addUserToWorkspace,
    removeUserFromWorkspace,
    setCurrentWorkspaceAndLoadData,
    resetWorkspaceData,
    validateAndLoadWorkspace,
    saveWorkspace
  };
});