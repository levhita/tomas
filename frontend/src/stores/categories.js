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
  async function fetchCategories() {
    try {
      const response = await fetchWithAuth('/api/categories');
      const data = await response.json();
      categories.value = data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  async function addCategory(category) {
    try {
      const response = await fetchWithAuth('/api/categories', {
        method: 'POST',
        body: JSON.stringify(category),
      });
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
      await fetchWithAuth(`/api/categories/${id}`, {
        method: 'DELETE'
      });
      const index = categories.value.findIndex(c => c.id === id);
      if (index !== -1) {
        categories.value.splice(index, 1);
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
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
  };
});
