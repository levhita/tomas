<template>
  <!-- Categories Management Modal -->
  <div class="modal fade" :class="{ show: modelValue }" :style="{ display: modelValue ? 'block' : 'none' }"
    tabindex="-1" ref="modalElement">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">Manage Categories</h3>
          <button type="button" class="btn-close" aria-label="Close" @click="close"></button>
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
                <button v-if="hasWritePermission" class="btn btn-primary btn-sm" @click="showAddRootCategory"
                  :disabled="isLoading">
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
                <CategoryForm :form="form" :is-loading="isLoading"
                  :available-parent-categories="availableParentCategories" mode="add" @submit="handleSubmit"
                  @cancel="hideForm" />
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
                    <div class="btn-group btn-group-sm" role="group" v-if="hasWritePermission">
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
                    <CategoryForm :form="form" :is-loading="isLoading"
                      :available-parent-categories="availableParentCategories" :editing-category="editingCategory"
                      mode="edit" @submit="handleSubmit" @cancel="hideForm" />
                  </div>

                  <!-- Add Child Category Form (inline when adding child to this category) -->
                  <div v-if="showForm && parentForNewChild && parentForNewChild.id === category.id"
                    class="list-group-item ps-5 bg-body-tertiary">
                    <CategoryForm :form="form" :is-loading="isLoading"
                      :available-parent-categories="availableParentCategories" :parent-category="parentForNewChild"
                      :parent-disabled="true" mode="add-child" @submit="handleSubmit" @cancel="hideForm" />
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
                    <div class="btn-group btn-group-sm" role="group" v-if="hasWritePermission">
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
                      <CategoryForm :form="form" :is-loading="isLoading"
                        :available-parent-categories="availableParentCategories" :editing-category="editingCategory"
                        mode="edit" @submit="handleSubmit" @cancel="hideForm" />
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="close" :disabled="isLoading">
            Close
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Bootstrap Modal Backdrop -->
  <div v-if="modelValue" class="modal-backdrop fade show"></div>
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
import { useCategoriesStore } from '../../stores/categories'
import { useWorkspacesStore } from '../../stores/workspaces'
import { useConfirm } from '../../composables/useConfirm'
import CategoryForm from '../inputs/CategoryForm.vue'

// Props
const props = defineProps({
  modelValue: Boolean,
  workspace: Object
})

// Events
const emit = defineEmits(['update:modelValue'])

// Store
const categoriesStore = useCategoriesStore()
const workspacesStore = useWorkspacesStore()
const { confirm } = useConfirm()

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

// Computed properties
const hasWritePermission = computed(() => workspacesStore.hasWritePermission)

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
 * Close the modal
 */
function close() {
  emit('update:modelValue', false)
}

/**
 * Shows the form for adding a root category
 */
function showAddRootCategory() {
  if (!hasWritePermission.value) return;
  resetForm()
  showForm.value = true
  parentForNewChild.value = null
}

/**
 * Shows the form for adding a child category
 */
function showAddChildCategory(parentCategory) {
  if (!hasWritePermission.value) return;
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
  if (!hasWritePermission.value) return;
  if (!form.value.name.trim() || !props.workspace) return;

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
  if (!hasWritePermission.value) return;
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
  if (!hasWritePermission.value) return;

  const children = getChildCategories(category.id)
  let confirmMessage = `Are you sure you want to delete the category "${category.name}"?`

  if (children.length > 0) {
    confirmMessage += `\n\nThis category has ${children.length} child categor${children.length === 1 ? 'y' : 'ies'} that will also be deleted.`
  }

  try {
    await confirm({
      title: 'Delete Category',
      message: confirmMessage,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmButtonVariant: 'danger'
    })

    isLoading.value = true
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

// Watch for modal visibility changes
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    // Show modal - add modal-open class to body and reset form
    document.body.classList.add('modal-open')
    resetForm()
    hideNotification()
  } else {
    // Remove modal-open class from body when modal hides
    document.body.classList.remove('modal-open')
  }
})

// Watch for workspace changes to reset form
watch(() => props.workspace, () => {
  resetForm()
})
</script>
