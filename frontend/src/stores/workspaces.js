import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import fetchWithAuth from '../utils/fetch';

export const useWorkspacesStore = defineStore('workspaces', () => {
  // State
  const workspaces = ref([]);
  const currentWorkspace = ref(null);
  const isLoading = ref(false);
  const error = ref(null);

  // Getters
  const workspacesByName = computed(() => {
    return workspaces.value.sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  });

  const getWorkspaceById = computed(() => {
    return (id) => workspaces.value.find(w => w.id === parseInt(id));
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

      return await response.json();
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

  function setCurrentWorkspace(workspace) {
    currentWorkspace.value = workspace;
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
    setCurrentWorkspace
  };
});