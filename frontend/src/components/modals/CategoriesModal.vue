<template>
  <!-- Categories Management Modal -->
  <div class="modal fade" id="categoriesModal" tabindex="-1" ref="modalElement">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header bg-primary text-white">
          <h5 class="modal-title">
            <i class="bi bi-tags me-2"></i>
            Manage Categories
          </h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <!-- Notification Area -->
          <div v-if="notification.show" :class="`alert alert-${notification.type} alert-dismissible`" role="alert">
            <div class="d-flex align-items-start">
              <i
                :class="`bi ${notification.type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} me-2 mt-1`"></i>
              <div class="flex-grow-1">
                <strong>{{ notification.title }}</strong>
                <div v-if="notification.details" class="small mt-1">{{ notification.details }}</div>
              </div>
              <button type="button" class="btn-close" @click="hideNotification" aria-label="Close"></button>
            </div>
          </div>

          <!-- Categories List -->
          <div class="card">
            <div class="card-header">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <h6 class="card-title mb-0">
                  <i class="bi bi-list-ul me-2"></i>
                  Categories ({{ filteredCategories.length }})
                </h6>
                <button class="btn btn-primary btn-sm" @click="showAddRootCategory" :disabled="isLoading">
                  <i class="bi bi-plus-circle me-1"></i>
                  Add Category
                </button>
              </div>
              <!-- Category Type Filter -->
              <div class="btn-group w-100" role="group" aria-label="Category type filter">
                <input type="radio" class="btn-check" name="categoryFilter" id="filterAll" value="all"
                  v-model="categoryFilter">
                <label class="btn btn-outline-secondary" for="filterAll">All Categories</label>

                <input type="radio" class="btn-check" name="categoryFilter" id="filterExpense" value="expense"
                  v-model="categoryFilter">
                <label class="btn btn-outline-danger" for="filterExpense">
                  <i class="bi bi-arrow-down-circle me-1"></i>Expenses
                </label>

                <input type="radio" class="btn-check" name="categoryFilter" id="filterIncome" value="income"
                  v-model="categoryFilter">
                <label class="btn btn-outline-success" for="filterIncome">
                  <i class="bi bi-arrow-up-circle me-1"></i>Income
                </label>
              </div>
            </div>
            <div class="card-body">
              <!-- Add Root Category Form (when showForm is true and no editing category) -->
              <div v-if="showForm && !editingCategory && !parentForNewChild"
                class="list-group-item bg-body-tertiary mb-3">
                <div class="card border-0 bg-transparent">
                  <div class="card-header bg-transparent border-0 px-0 py-2">
                    <h6 class="card-title mb-0 d-flex justify-content-between align-items-center">
                      <span>
                        <i class="bi bi-plus-circle me-2"></i>
                        Add New Category
                      </span>
                      <button type="button" class="btn btn-sm btn-outline-secondary" @click="hideForm"
                        aria-label="Close form">
                        <i class="bi bi-x"></i>
                      </button>
                    </h6>
                  </div>
                  <div class="card-body px-0">
                    <form @submit.prevent="handleSubmit">
                      <div class="row">
                        <div class="col-md-4">
                          <div class="form-floating">
                            <input type="text" class="form-control" id="categoryName" v-model="form.name" required
                              :disabled="isLoading" placeholder="e.g., Food, Transportation, Entertainment">
                            <label for="categoryName">Name *</label>
                          </div>
                        </div>
                        <div class="col-md-4">
                          <div class="form-floating">
                            <select class="form-select" id="categoryType" v-model="form.type" :disabled="isLoading">
                              <option value="expense">Expense</option>
                              <option value="income">Income</option>
                            </select>
                            <label for="categoryType">Type</label>
                          </div>
                        </div>
                        <div class="col-md-4">
                          <div class="form-floating">
                            <select class="form-select" id="categoryParent" v-model="form.parent_category_id"
                              :disabled="isLoading">
                              <option value="">None (Root Category)</option>
                              <option v-for="category in availableParentCategories" :key="category.id"
                                :value="category.id">
                                {{ category.name }}
                              </option>
                            </select>
                            <label for="categoryParent">Parent Category</label>
                          </div>
                        </div>
                      </div>
                      <div class="mt-3">
                        <div class="form-floating">
                          <textarea class="form-control textarea-description" id="categoryDescription"
                            v-model="form.description" rows="2" :disabled="isLoading"
                            placeholder="Optional description of this category..."></textarea>
                          <label for="categoryDescription">Description</label>
                        </div>
                      </div>
                      <div class="mt-3">
                        <button type="submit" class="btn btn-primary me-2" :disabled="isLoading || !form.name.trim()">
                          <span v-if="isLoading" class="spinner-border spinner-border-sm me-2" role="status"
                            aria-hidden="true"></span>
                          Add Category
                        </button>
                        <button type="button" class="btn btn-secondary" @click="hideForm" :disabled="isLoading">
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>

              <!-- Categories List or Empty State -->
              <div v-if="categoriesStore.categories.length === 0" class="text-center text-muted py-4">
                <i class="bi bi-tags fs-1 d-block mb-2"></i>
                <p class="mb-0">No categories found</p>
                <small>Add your first category above</small>
              </div>
              <div v-else-if="filteredCategories.length === 0" class="text-center text-muted py-4">
                <i class="bi bi-funnel fs-1 d-block mb-2"></i>
                <p class="mb-0">No {{ categoryFilter }} categories found</p>
                <small>Try a different filter or add a new category</small>
              </div>
              <div v-else class="list-group list-group-flush">

                <!-- Root Categories -->
                <div v-for="category in rootCategories" :key="category.id" class="category-item">
                  <!-- Category Item -->
                  <div class="list-group-item d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                      <div class="d-flex align-items-center">
                        <strong>{{ category.name }}</strong>
                        <span class="badge ms-2" :class="category.type === 'expense' ? 'bg-danger' : 'bg-success'">
                          {{ category.type === 'expense' ? 'Expense' : 'Income' }}
                        </span>
                        <span v-if="category.description" class="text-muted ms-2">- {{ category.description }}</span>
                      </div>
                    </div>
                    <div class="btn-group btn-group-sm" role="group">
                      <button type="button" class="btn btn-outline-success" @click="showAddChildCategory(category)"
                        :disabled="isLoading" title="Add child category">
                        <i class="bi bi-plus"></i>
                      </button>
                      <button type="button" class="btn btn-outline-primary" @click="editCategory(category)"
                        :disabled="isLoading" title="Edit category">
                        <i class="bi bi-pencil"></i>
                      </button>
                      <button type="button" class="btn btn-outline-danger" @click="deleteCategory(category)"
                        :disabled="isLoading" title="Delete category">
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
                  </div>

                  <!-- Edit Category Form (inline when editing this category) -->
                  <div v-if="showForm && editingCategory && editingCategory.id === category.id"
                    class="list-group-item bg-body-tertiary">
                    <div class="card border-0 bg-transparent">
                      <div class="card-header bg-transparent border-0 px-0 py-2">
                        <h6 class="card-title mb-0 d-flex justify-content-between align-items-center">
                          <span>
                            <i class="bi bi-pencil me-2"></i>
                            Edit Category
                          </span>
                          <button type="button" class="btn btn-sm btn-outline-secondary" @click="hideForm"
                            aria-label="Close form">
                            <i class="bi bi-x"></i>
                          </button>
                        </h6>
                      </div>
                      <div class="card-body px-0">
                        <form @submit.prevent="handleSubmit">
                          <div class="row">
                            <div class="col-md-4">
                              <div class="form-floating">
                                <input type="text" class="form-control" id="editCategoryName" v-model="form.name"
                                  required :disabled="isLoading"
                                  placeholder="e.g., Food, Transportation, Entertainment">
                                <label for="editCategoryName">Name *</label>
                              </div>
                            </div>
                            <div class="col-md-4">
                              <div class="form-floating">
                                <select class="form-select" id="editCategoryType" v-model="form.type"
                                  :disabled="isLoading || (editingCategory && hasChildren(editingCategory.id))">
                                  <option value="expense">Expense</option>
                                  <option value="income">Income</option>
                                </select>
                                <label for="editCategoryType">Type</label>
                                <div v-if="editingCategory && hasChildren(editingCategory.id)" class="form-text">
                                  <small class="text-muted">
                                    <i class="bi bi-info-circle me-1"></i>
                                    Type cannot be changed because this category has child categories
                                  </small>
                                </div>
                              </div>
                            </div>
                            <div class="col-md-4">
                              <div class="form-floating">
                                <select class="form-select" id="editCategoryParent" v-model="form.parent_category_id"
                                  :disabled="isLoading">
                                  <option value="">None (Root Category)</option>
                                  <option v-for="cat in availableParentCategories" :key="cat.id" :value="cat.id">
                                    {{ cat.name }}
                                  </option>
                                </select>
                                <label for="editCategoryParent">Parent Category</label>
                              </div>
                            </div>
                          </div>
                          <div class="mt-3">
                            <div class="form-floating">
                              <textarea class="form-control textarea-description" id="editCategoryDescription"
                                v-model="form.description" rows="2" :disabled="isLoading"
                                placeholder="Optional description of this category..."></textarea>
                              <label for="editCategoryDescription">Description</label>
                            </div>
                          </div>
                          <div class="mt-3">
                            <button type="submit" class="btn btn-primary me-2"
                              :disabled="isLoading || !form.name.trim()">
                              <span v-if="isLoading" class="spinner-border spinner-border-sm me-2" role="status"
                                aria-hidden="true"></span>
                              Update Category
                            </button>
                            <button type="button" class="btn btn-secondary" @click="hideForm" :disabled="isLoading">
                              Cancel
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>

                  <!-- Add Child Category Form (inline when adding child to this category) -->
                  <div v-if="showForm && parentForNewChild && parentForNewChild.id === category.id"
                    class="list-group-item ps-5 bg-body-tertiary">
                    <div class="card border-0 bg-transparent">
                      <div class="card-header bg-transparent border-0 px-0 py-2">
                        <h6 class="card-title mb-0 d-flex justify-content-between align-items-center">
                          <span>
                            <i class="bi bi-plus-circle me-2"></i>
                            Add Child to "{{ parentForNewChild.name }}"
                          </span>
                          <button type="button" class="btn btn-sm btn-outline-secondary" @click="hideForm"
                            aria-label="Close form">
                            <i class="bi bi-x"></i>
                          </button>
                        </h6>
                      </div>
                      <div class="card-body px-0">
                        <form @submit.prevent="handleSubmit">
                          <div class="row">
                            <div class="col-md-4">
                              <div class="form-floating">
                                <input type="text" class="form-control" id="childCategoryName" v-model="form.name"
                                  required :disabled="isLoading" placeholder="e.g., Groceries, Fast Food">
                                <label for="childCategoryName">Name *</label>
                              </div>
                            </div>
                            <div class="col-md-4">
                              <div class="form-floating">
                                <select class="form-select" id="childCategoryType" v-model="form.type" :disabled="true">
                                  <option :value="parentForNewChild.type">
                                    {{ parentForNewChild.type === 'expense' ? 'Expense' : 'Income' }} (inherited)
                                  </option>
                                </select>
                                <label for="childCategoryType">Type</label>
                              </div>
                            </div>
                            <div class="col-md-4">
                              <div class="form-floating">
                                <select class="form-select" id="childCategoryParent" v-model="form.parent_category_id"
                                  :disabled="true">
                                  <option :value="parentForNewChild.id">{{ parentForNewChild.name }}</option>
                                </select>
                                <label for="childCategoryParent">Parent Category</label>
                              </div>
                            </div>
                          </div>
                          <div class="mt-3">
                            <div class="form-floating">
                              <textarea class="form-control textarea-description" id="childCategoryDescription"
                                v-model="form.description" rows="2" :disabled="isLoading"
                                placeholder="Optional description of this category..."></textarea>
                              <label for="childCategoryDescription">Description</label>
                            </div>
                          </div>
                          <div class="mt-3">
                            <button type="submit" class="btn btn-primary me-2"
                              :disabled="isLoading || !form.name.trim()">
                              <span v-if="isLoading" class="spinner-border spinner-border-sm me-2" role="status"
                                aria-hidden="true"></span>
                              Add Category
                            </button>
                            <button type="button" class="btn btn-secondary" @click="hideForm" :disabled="isLoading">
                              Cancel
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>

                  <!-- Child Categories -->
                  <div v-for="childCategory in getChildCategories(category.id)" :key="childCategory.id"
                    class="list-group-item ps-5 d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                      <div class="d-flex align-items-center">
                        <i class="bi bi-arrow-return-right me-2 text-muted"></i>
                        <span>{{ childCategory.name }}</span>
                        <span v-if="childCategory.description" class="text-muted ms-2">-
                          {{ childCategory.description }}</span>
                      </div>
                    </div>
                    <div class="btn-group btn-group-sm" role="group">
                      <button type="button" class="btn btn-outline-primary" @click="editCategory(childCategory)"
                        :disabled="isLoading" title="Edit category">
                        <i class="bi bi-pencil"></i>
                      </button>
                      <button type="button" class="btn btn-outline-danger" @click="deleteCategory(childCategory)"
                        :disabled="isLoading" title="Delete category">
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
                  </div>

                  <!-- Edit Child Category Form (inline when editing this child category) -->
                  <template v-for="childCategory in getChildCategories(category.id)" :key="`edit-${childCategory.id}`">
                    <div v-if="showForm && editingCategory && editingCategory.id === childCategory.id"
                      class="list-group-item ps-5 bg-body-tertiary">
                      <div class="card border-0 bg-transparent">
                        <div class="card-header bg-transparent border-0 px-0 py-2">
                          <h6 class="card-title mb-0 d-flex justify-content-between align-items-center">
                            <span>
                              <i class="bi bi-pencil me-2"></i>
                              Edit Child Category
                            </span>
                            <button type="button" class="btn btn-sm btn-outline-secondary" @click="hideForm"
                              aria-label="Close form">
                              <i class="bi bi-x"></i>
                            </button>
                          </h6>
                        </div>
                        <div class="card-body px-0">
                          <form @submit.prevent="handleSubmit">
                            <div class="row">
                              <div class="col-md-4">
                                <div class="form-floating">
                                  <input type="text" class="form-control"
                                    :id="`editChildCategoryName-${childCategory.id}`" v-model="form.name" required
                                    :disabled="isLoading" placeholder="e.g., Groceries, Fast Food">
                                  <label :for="`editChildCategoryName-${childCategory.id}`">Name *</label>
                                </div>
                              </div>
                              <div class="col-md-4">
                                <div class="form-floating">
                                  <input type="text" class="form-control"
                                    :id="`editChildCategoryType-${childCategory.id}`"
                                    :value="`${form.type === 'expense' ? 'Expense' : 'Income'} (inherited from parent)`"
                                    readonly disabled>
                                  <label :for="`editChildCategoryType-${childCategory.id}`">Type</label>
                                </div>
                              </div>
                              <div class="col-md-4">
                                <div class="form-floating">
                                  <select class="form-select" :id="`editChildCategoryParent-${childCategory.id}`"
                                    v-model="form.parent_category_id" :disabled="isLoading">
                                    <option value="">None (Root Category)</option>
                                    <option v-for="cat in availableParentCategories" :key="cat.id" :value="cat.id">
                                      {{ cat.name }}
                                    </option>
                                  </select>
                                  <label :for="`editChildCategoryParent-${childCategory.id}`">Parent Category</label>
                                </div>
                              </div>
                            </div>
                            <div class="mt-3">
                              <div class="form-floating">
                                <textarea class="form-control textarea-description"
                                  :id="`editChildCategoryDescription-${childCategory.id}`" v-model="form.description"
                                  rows="2" :disabled="isLoading"
                                  placeholder="Optional description of this category..."></textarea>
                                <label :for="`editChildCategoryDescription-${childCategory.id}`">Description</label>
                              </div>
                            </div>
                            <div class="mt-3">
                              <button type="submit" class="btn btn-primary me-2"
                                :disabled="isLoading || !form.name.trim()">
                                <span v-if="isLoading" class="spinner-border spinner-border-sm me-2" role="status"
                                  aria-hidden="true"></span>
                                Update Category
                              </button>
                              <button type="button" class="btn btn-secondary" @click="hideForm" :disabled="isLoading">
                                Cancel
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" :disabled="isLoading">
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * CategoriesModal Component
 * 
 * A comprehensive modal component for managing categories within a workspace.
 * Provides functionality to create, edit, delete, and organize categories
 * in a hierarchical structure with parent-child relationships.
 * 
 * Features:
 * - Create new categories with name, description, and parent category
 * - Edit existing categories with pre-populated data
 * - Delete categories with confirmation
 * - Hierarchical display of parent and child categories
 * - Form validation (required name field)
 * - Loading states during operations
 * - Bootstrap modal integration with proper accessibility
 * - Responsive design for mobile and desktop
 * 
 * Category Fields:
 * - name: Required category name (string)
 * - description: Optional category description (string)
 * - parent_category_id: Optional parent category ID for hierarchical organization
 * - workspace_id: Workspace ID (automatically set from current workspace)
 * 
 * Props:
 * @prop {Object} workspace - Current workspace object containing id
 * 
 * Dependencies:
 * - Vue 3 Composition API
 * - Bootstrap Modal
 * - Categories Store (Pinia)
 * - Bootstrap Icons
 * 
 * @component
 */

import { ref, computed, watch } from 'vue'
import { Modal } from 'bootstrap'
import { useCategoriesStore } from '../../stores/categories'

// Props
const props = defineProps({
  workspace: Object
})

// Store
const categoriesStore = useCategoriesStore()

// Template refs
const modalElement = ref(null)

// Component state
const form = ref({
  name: '',
  description: '',
  parent_category_id: null,
  type: 'expense'
})

const editingCategory = ref(null)
const isLoading = ref(false)
const showForm = ref(false)
const parentForNewChild = ref(null)
const categoryFilter = ref('all') // 'all', 'expense', 'income'

// Notification state
const notification = ref({
  show: false,
  type: 'success', // 'success' or 'error'
  title: '',
  details: ''
})

// Bootstrap modal instance
let bsModal = null

// Computed properties
const filteredCategories = computed(() => {
  if (categoryFilter.value === 'all') {
    return categoriesStore.categories
  }
  return categoriesStore.categories.filter(c => c.type === categoryFilter.value)
})

const rootCategories = computed(() => {
  return filteredCategories.value.filter(c => !c.parent_category_id)
})

const availableParentCategories = computed(() => {
  // When editing, exclude the category being edited and its children to prevent circular references
  if (editingCategory.value) {
    const childIds = getAllChildIds(editingCategory.value.id)
    return categoriesStore.categories.filter(c =>
      c.id !== editingCategory.value.id &&
      !childIds.includes(c.id) &&
      !c.parent_category_id && // Only show root categories as potential parents
      c.type === form.value.type // Only show categories of the same type
    )
  }
  return categoriesStore.categories.filter(c =>
    !c.parent_category_id &&
    c.type === form.value.type // Only show categories of the same type
  )
})

// Helper functions
function getChildCategories(parentId) {
  return filteredCategories.value.filter(c => c.parent_category_id === parentId)
}

function hasChildren(categoryId) {
  return categoriesStore.categories.some(c => c.parent_category_id === categoryId)
}

function getAllChildIds(parentId) {
  const children = getChildCategories(parentId)
  let allIds = children.map(c => c.id)
  children.forEach(child => {
    allIds = allIds.concat(getAllChildIds(child.id))
  })
  return allIds
}

/**
 * Initialize Bootstrap modal when component mounts
 */
function initializeModal() {
  if (modalElement.value && !bsModal) {
    bsModal = new Modal(modalElement.value)
  }
}

/**
 * Shows the modal for managing categories
 */
function show() {
  initializeModal()
  resetForm()
  hideNotification()
  bsModal?.show()
}

/**
 * Hides the modal
 */
function hide() {
  bsModal?.hide()
}

/**
 * Shows the form for adding a root category
 */
function showAddRootCategory() {
  resetForm()
  showForm.value = true
  parentForNewChild.value = null
}

/**
 * Shows the form for adding a child category
 */
function showAddChildCategory(parentCategory) {
  resetForm()
  form.value.parent_category_id = parentCategory.id
  form.value.type = parentCategory.type // Inherit type from parent
  parentForNewChild.value = parentCategory
  showForm.value = true
}

/**
 * Hides the add/edit form
 */
function hideForm() {
  showForm.value = false
  resetForm()
}

/**
 * Shows a notification message
 */
function showNotification(type, title, details = '') {
  notification.value = {
    show: true,
    type,
    title,
    details
  }

  // Auto-hide success notifications after 5 seconds
  if (type === 'success') {
    setTimeout(() => {
      hideNotification()
    }, 5000)
  }
}

/**
 * Hides the notification
 */
function hideNotification() {
  notification.value.show = false
}

/**
 * Resets the form to initial state
 */
function resetForm() {
  form.value = {
    name: '',
    description: '',
    parent_category_id: null,
    type: 'expense'
  }
  editingCategory.value = null
  parentForNewChild.value = null
  showForm.value = false
  hideNotification()
}

/**
 * Handles form submission for creating or updating a category
 */
async function handleSubmit() {
  if (!form.value.name.trim() || !props.workspace) return

  isLoading.value = true
  try {
    const categoryData = {
      name: form.value.name.trim(),
      description: form.value.description?.trim() || '',
      parent_category_id: form.value.parent_category_id || null,
      type: form.value.type,
      workspace_id: props.workspace.id
    }

    if (editingCategory.value) {
      // Update existing category
      await categoriesStore.updateCategory(editingCategory.value.id, categoryData)
      showNotification('success', `Category "${categoryData.name}" has been updated successfully.`)
    } else {
      // Create new category
      await categoriesStore.addCategory(categoryData)
      showNotification('success', `Category "${categoryData.name}" has been created successfully.`)
    }

    hideForm()
  } catch (error) {
    console.error('Error saving category:', error)
    const action = editingCategory.value ? 'update' : 'create'
    showNotification('error',
      `Failed to ${action} category "${form.value.name}".`,
      error.message
    )
  } finally {
    isLoading.value = false
  }
}

/**
 * Sets up form for editing an existing category
 */
function editCategory(category) {
  editingCategory.value = category
  form.value = {
    name: category.name,
    description: category.description || '',
    parent_category_id: category.parent_category_id || null,
    type: category.type || 'expense'
  }
  parentForNewChild.value = null
  showForm.value = true
}

/**
 * Cancels editing mode and resets form
 */
function cancelEdit() {
  hideForm()
}

/**
 * Deletes a category with confirmation
 */
async function deleteCategory(category) {
  const children = getChildCategories(category.id)
  let confirmMessage = `Are you sure you want to delete the category "${category.name}"?`

  if (children.length > 0) {
    confirmMessage += `\n\nThis category has ${children.length} child categor${children.length === 1 ? 'y' : 'ies'} that will also be deleted.`
  }

  if (!confirm(confirmMessage)) return

  isLoading.value = true
  try {
    await categoriesStore.deleteCategory(category.id)

    // If we were editing this category, reset the form
    if (editingCategory.value && editingCategory.value.id === category.id) {
      resetForm()
    }

    // Show success message
    showNotification('success', `Category "${category.name}" has been deleted successfully.`)
  } catch (error) {
    console.error('Error deleting category:', error)

    // Handle specific error cases
    if (error.code === 'CATEGORY_HAS_TRANSACTIONS' || error.status === 428) {
      showNotification('error',
        `Cannot delete category "${category.name}" because it has transactions associated with it.`,
        'Please move or delete all transactions in this category first, then try again.'
      )
    } else {
      showNotification('error',
        `Failed to delete category "${category.name}".`,
        error.message
      )
    }
  } finally {
    isLoading.value = false
  }
}

// Watch for workspace changes to reset form
watch(() => props.workspace, () => {
  resetForm()
})

// Expose methods for parent component access
defineExpose({
  show,
  hide
})
</script>
