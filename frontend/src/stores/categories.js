import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import fetchWithAuth from '../utils/fetch';

export const useCategoriesStore = defineStore('categories', () => {
  // State
  const categories = ref([]);

  // Getters
  const categoriesByName = computed(() => {
    return categories.value.sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  });

  const getCategoryById = computed(() => {
    return (id) => categories.value.find(c => c.id === id);
  });

  const categoryTree = computed(() => {
    const rootCategories = categories.value.filter(c => !c.parent_category_id);
    return rootCategories.map(category => ({
      ...category,
      children: getChildCategories(category.id)
    }));
  });

  // Helper function for Tree
  function getChildCategories(parentId) {
    return categories.value
      .filter(c => c.parent_category_id === parentId)
      .map(category => ({
        ...category,
        children: getChildCategories(category.id)
      }));
  }

  // Actions
  async function fetchCategories(workspaceId) {
    try {
      // Check if workspaceId is provided
      if (!workspaceId) {
        console.error('fetchCategories: workspaceId is required');
        throw new Error('Workspace ID is required to fetch categories');
      }

      // Fetch categories for the specified workspace
      const response = await fetchWithAuth(`/api/categories?workspace_id=${workspaceId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch categories');
      }

      const data = await response.json();
      categories.value = data;
      return data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  async function addCategory(category) {
    try {
      // Make sure category has a workspace_id
      if (!category.workspace_id) {
        throw new Error('workspace_id is required when creating a category');
      }

      const response = await fetchWithAuth('/api/categories', {
        method: 'POST',
        body: JSON.stringify(category),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add category');
      }

      const newCategory = await response.json();
      categories.value.push(newCategory);
      return newCategory;
    } catch (error) {
      console.error('Error adding category:', error);
      throw error;
    }
  }

  async function updateCategory(id, updates) {
    try {
      const response = await fetchWithAuth(`/api/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update category');
      }

      const updatedCategory = await response.json();
      const index = categories.value.findIndex(c => c.id === id);
      if (index !== -1) {
        categories.value[index] = updatedCategory;
      }
      return updatedCategory;
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }

  async function deleteCategory(id) {
    try {
      const response = await fetchWithAuth(`/api/categories/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok && response.status !== 204) {
        const errorData = await response.json();
        const error = new Error(errorData.error || 'Failed to delete category');
        error.status = response.status;
        error.code = response.status === 428 ? 'CATEGORY_HAS_TRANSACTIONS' : 'UNKNOWN_ERROR';
        throw error;
      }

      const index = categories.value.findIndex(c => c.id === id);
      if (index !== -1) {
        categories.value.splice(index, 1);
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }

  // Add this function to the store
  function resetState() {
    categories.value = [];
  }

  return {
    // State
    categories,
    // Getters
    categoriesByName,
    getCategoryById,
    categoryTree,
    // Actions
    fetchCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    // New action
    resetState,
  };
});
