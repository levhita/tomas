<template>
  <!-- Bootstrap Modal Container -->
  <div class="modal fade" :class="{ show: modelValue }" :style="{ display: modelValue ? 'block' : 'none' }"
    tabindex="-1" ref="modalElement">
    <div class="modal-dialog">
      <div class="modal-content">
        <!-- Modal Header -->
        <div class="modal-header">
          <h3 class="modal-title">{{ isEditing ? 'Edit' : 'Create New' }} User</h3>
          <button type="button" class="btn-close" aria-label="Close" @click="close"></button>
        </div>

        <!-- Modal Body -->
        <div class="modal-body">
          <form @submit.prevent="save">
            <!-- Username Field -->
            <div class="form-floating mb-3">
              <input type="text" class="form-control" :class="{ 'is-invalid': errors.username }" id="foo"
                v-model="form.username" placeholder="Username" required :disabled="isLoading" ref="usernameInput"
                name="foo" autocomplete="off">
              <label for="foo">Username</label>
              <div class="invalid-feedback" v-if="errors.username">
                {{ errors.username }}
              </div>
            </div>

            <!-- Change Password Toggle (only for editing) -->
            <div class="mb-3" v-if="isEditing">
              <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" id="changePassword" v-model="form.changePassword"
                  :disabled="isLoading">
                <label class="form-check-label" for="changePassword">
                  Change Password
                </label>
              </div>
              <div class="form-text">
                Check this box to change the user's password
              </div>
            </div>

            <!-- Password Field -->
            <div class="form-floating mb-3" v-if="!isEditing || form.changePassword">
              <input type="password" class="form-control" :class="{ 'is-invalid': errors.password }" id="bar"
                v-model="form.password" placeholder="Password" :required="!isEditing || form.changePassword"
                :disabled="isLoading" name="bar" autocomplete="off">
              <label for="bar">Password</label>
              <div class="invalid-feedback" v-if="errors.password">
                {{ errors.password }}
              </div>
            </div>

            <!-- Confirm Password Field -->
            <div class="form-floating mb-3" v-if="!isEditing || form.changePassword">
              <input type="password" class="form-control" :class="{ 'is-invalid': errors.confirmPassword }" id="baz"
                v-model="form.confirmPassword" placeholder="Confirm Password" required :disabled="isLoading" name="baz"
                autocomplete="off">
              <label for="baz">Confirm Password</label>
              <div class="invalid-feedback" v-if="errors.confirmPassword">
                {{ errors.confirmPassword }}
              </div>
            </div>

            <!-- Super Admin Toggle -->
            <div class="mb-3">
              <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" id="superadmin" v-model="form.superadmin"
                  :disabled="isLoading">
                <label class="form-check-label" for="superadmin">
                  Super Administrator
                </label>
              </div>
              <div class="form-text">
                Super administrators have full access to the system including user management
              </div>
            </div>

            <!-- Workspace Access Section (only for editing existing users) -->
            <div class="mb-3" v-if="isEditing">
              <h5 class="border-bottom pb-2 mb-3">
                <i class="bi bi-folder2 me-2"></i>Workspace Access
              </h5>

              <!-- Loading state -->
              <div v-if="isLoadingWorkspaces" class="text-center py-3">
                <div class="spinner-border spinner-border-sm" role="status">
                  <span class="visually-hidden">Loading workspaces...</span>
                </div>
                <small class="text-muted ms-2">Loading workspace information...</small>
              </div>

              <!-- Current workspace access -->
              <div v-else-if="userWorkspaces.length > 0">
                <h6 class="text-muted mb-3">Current Access ({{ userWorkspaces.length }})</h6>
                <div class="row g-2 mb-3">
                  <div v-for="workspace in userWorkspaces" :key="workspace.id" class="col-12">
                    <div class="card card-body py-2">
                      <div class="d-flex justify-content-between align-items-center">
                        <div class="flex-grow-1">
                          <div class="fw-semibold">{{ workspace.name }}</div>
                          <small class="text-muted">{{ workspace.description || 'No description' }}</small>
                        </div>
                        <div class="d-flex align-items-center gap-2">
                          <!-- Role selector -->
                          <select class="form-select form-select-sm" :value="workspace.role"
                            @change="updateWorkspaceRole(workspace.id, $event.target.value)"
                            :disabled="isUpdatingWorkspace === workspace.id" style="min-width: 110px;">
                            <option value="viewer">Viewer</option>
                            <option value="collaborator">Collaborator</option>
                            <option value="admin">Admin</option>
                          </select>
                          <!-- Remove button -->
                          <button type="button" class="btn btn-sm btn-outline-danger"
                            @click="removeFromWorkspace(workspace.id)" :disabled="isUpdatingWorkspace === workspace.id"
                            title="Remove from workspace">
                            <i class="bi bi-trash" v-if="isUpdatingWorkspace !== workspace.id"></i>
                            <div class="spinner-border spinner-border-sm" v-else role="status">
                              <span class="visually-hidden">Removing...</span>
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- No workspace access -->
              <div v-else class="alert alert-info mb-3">
                <i class="bi bi-info-circle me-2"></i>
                This user doesn't have access to any workspaces.
              </div>

              <!-- Add to workspace section -->
              <div class="border-top pt-3">
                <h6 class="text-muted mb-3">Add to Workspace</h6>
                <div class="row g-2">
                  <div class="col-12 col-md-6">
                    <div class="position-relative">
                      <input type="text" class="form-control" v-model="workspaceSearchQuery"
                        @input="onWorkspaceSearchInput" @focus="showWorkspaceResults = true"
                        @blur="hideWorkspaceResults" placeholder="Search workspace by name or ID..."
                        :disabled="isAddingToWorkspace" autocomplete="off">

                      <!-- Search results dropdown -->
                      <div v-if="showWorkspaceResults && (workspaceSearchResults.length > 0 || isSearchingWorkspaces)"
                        class="position-absolute w-100 bg-body border border-top-0 rounded-bottom shadow-sm"
                        style="z-index: 1050; max-height: 200px; overflow-y: auto;">

                        <!-- Loading state -->
                        <div v-if="isSearchingWorkspaces" class="p-3 text-center">
                          <div class="spinner-border spinner-border-sm" role="status">
                            <span class="visually-hidden">Searching...</span>
                          </div>
                          <small class="text-muted ms-2">Searching workspaces...</small>
                        </div>

                        <!-- Search results -->
                        <div v-else>
                          <button v-for="workspace in workspaceSearchResults" :key="workspace.id" type="button"
                            class="btn btn-link text-start w-100 border-0 rounded-0 p-3"
                            @mousedown="selectWorkspaceFromSearch(workspace)" style="text-decoration: none;">
                            <div class="fw-semibold">{{ workspace.name }}</div>
                            <small class="text-muted">ID: {{ workspace.id }} •
                              {{ workspace.description || 'No description' }}</small>
                          </button>

                          <!-- No results -->
                          <div v-if="workspaceSearchResults.length === 0 && workspaceSearchQuery.trim()"
                            class="p-3 text-center text-muted">
                            <i class="bi bi-search me-2"></i>No workspaces found
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="col-12 col-md-4">
                    <select class="form-select" v-model="newWorkspaceRole" :disabled="isAddingToWorkspace">
                      <option value="viewer">👁️ Viewer</option>
                      <option value="collaborator">✏️ Collaborator</option>
                      <option value="admin">🛡️ Admin</option>
                    </select>
                  </div>
                  <div class="col-12 col-md-2">
                    <button type="button" class="btn btn-success w-100" @click="addToWorkspace"
                      :disabled="!selectedWorkspaceForAdd || isAddingToWorkspace">
                      <span v-if="isAddingToWorkspace" class="spinner-border spinner-border-sm me-2"
                        role="status"></span>
                      <i class="bi bi-plus-circle-fill" v-else></i>
                    </button>
                  </div>
                </div>

                <!-- Selected workspace preview -->
                <div v-if="selectedWorkspaceForAdd" class="mt-2">
                  <small class="text-muted">Selected: </small>
                  <span class="badge bg-primary">{{ selectedWorkspaceForAdd.name }}</span>
                  <button type="button" class="btn btn-sm btn-link text-danger p-0 ms-2"
                    @click="clearWorkspaceSelection" :disabled="isAddingToWorkspace">
                    <i class="bi bi-x-circle"></i>
                  </button>
                </div>
              </div>
            </div>

            <!-- Error Display -->
            <div class="alert alert-danger" v-if="errorMessage">
              {{ errorMessage }}
            </div>

            <!-- Success Display -->
            <div class="alert alert-success" v-if="successMessage">
              {{ successMessage }}
            </div>
          </form>
        </div>

        <!-- Modal Footer -->
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="close" :disabled="isLoading">
            Cancel
          </button>
          <button type="submit" class="btn btn-primary" @click="save" :disabled="isLoading || !isFormValid">
            <span v-if="isLoading" class="spinner-border spinner-border-sm me-2" role="status"></span>
            {{ isEditing ? 'Update User' : 'Create User' }}
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
 * UserModal Component
 * 
 * Modal dialog for creating and editing users in the admin interface.
 * Uses the simple HTML-based modal pattern for consistency with TransactionModal.
 * 
 * Features:
 * - Create new users with username, password, and admin privileges
 * - Edit existing users (username, password, admin status)
 * - Form validation with real-time feedback
 * - Password confirmation validation
 * - Simple Bootstrap modal integration
 * - Error and success message display
 * 
 * Props:
 * @prop {boolean} modelValue - Controls modal visibility
 * @prop {Object} user - User object for editing (null for creation)
 * 
 * Events:
 * @event update:modelValue - Emitted when modal visibility should change
 * @event save - Emitted when user is successfully created/updated
 * 
 * @component
 */

import { ref, computed, watch, nextTick } from 'vue'
import { useUsersStore } from '../../stores/users'

const props = defineProps({
  modelValue: Boolean,
  user: Object
})

const emit = defineEmits(['update:modelValue', 'save'])

// Template refs
const usernameInput = ref(null)
const modalElement = ref(null)

// Form state
const form = ref({
  username: '',
  password: '',
  confirmPassword: '',
  superadmin: false,
  changePassword: false
})

// Workspace management state
const userWorkspaces = ref([])
const isLoadingWorkspaces = ref(false)
const isUpdatingWorkspace = ref(null)
const isAddingToWorkspace = ref(false)
const newWorkspaceRole = ref('viewer')

// Workspace search state
const workspaceSearchQuery = ref('')
const workspaceSearchResults = ref([])
const isSearchingWorkspaces = ref(false)
const showWorkspaceResults = ref(false)
const selectedWorkspaceForAdd = ref(null)
const searchTimeout = ref(null)

const errors = ref({})
const errorMessage = ref('')
const successMessage = ref('')
const isLoading = ref(false)

// Users store
const usersStore = useUsersStore()

// Computed properties
const isEditing = computed(() => !!props.user)

const isFormValid = computed(() => {
  if (!form.value.username.trim()) return false
  if (!isEditing.value && !form.value.password) return false
  if (isEditing.value && form.value.changePassword && !form.value.password) return false
  if ((form.value.changePassword || !isEditing.value) && form.value.password && form.value.password !== form.value.confirmPassword) {
    return false
  }
  return Object.keys(errors.value).length === 0
})

// Form validation
function validateForm() {
  errors.value = {}

  // Username validation
  if (!form.value.username.trim()) {
    errors.value.username = 'Username is required'
  } else if (form.value.username.length < 3) {
    errors.value.username = 'Username must be at least 3 characters'
  } else if (form.value.username.length > 50) {
    errors.value.username = 'Username must be less than 50 characters'
  } else if (!/^[a-zA-Z0-9_-]+$/.test(form.value.username)) {
    errors.value.username = 'Username can only contain letters, numbers, underscores, and hyphens'
  }

  // Password validation (only required for new users or when changing password)
  if (!isEditing.value || form.value.changePassword) {
    if (!form.value.password) {
      errors.value.password = 'Password is required'
    } else if (form.value.password.length < 6) {
      errors.value.password = 'Password must be at least 6 characters'
    } else if (form.value.password.length > 100) {
      errors.value.password = 'Password must be less than 100 characters'
    }

    // Confirm password validation
    if (form.value.password && form.value.password !== form.value.confirmPassword) {
      errors.value.confirmPassword = 'Passwords do not match'
    }
  }
}

// Form submission
async function save() {
  validateForm()

  if (!isFormValid.value) {
    return
  }

  isLoading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const userData = {
      username: form.value.username.trim(),
      superadmin: form.value.superadmin
    }

    // Only include password if it's provided and we're changing it
    if (form.value.password && (!isEditing.value || form.value.changePassword)) {
      userData.password = form.value.password
    }

    if (isEditing.value) {
      // Update existing user
      await usersStore.updateUser(props.user.id, userData)
      successMessage.value = 'User updated successfully!'
    } else {
      // Create new user
      await usersStore.createUser(userData)
      successMessage.value = 'User created successfully!'
    }

    // Emit success event
    emit('save')

    // Close modal after a short delay to show success message
    setTimeout(() => {
      close()
    }, 1500)

  } catch (error) {
    errorMessage.value = error.message || 'An error occurred while saving the user'
  } finally {
    isLoading.value = false
  }
}

function close() {
  emit('update:modelValue', false)
}

// Workspace management functions
async function loadWorkspaceData() {
  if (!props.user || !usersStore.isSuperAdmin) return

  isLoadingWorkspaces.value = true
  try {
    // Only load user's current workspaces
    const userWs = await usersStore.getUserWorkspaces(props.user.id)
    userWorkspaces.value = userWs
  } catch (error) {
    console.error('Error loading workspace data:', error)
    errorMessage.value = 'Failed to load workspace information'
  } finally {
    isLoadingWorkspaces.value = false
  }
}

// Workspace search functions
function onWorkspaceSearchInput() {
  // Clear previous timeout
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }

  // Clear previous selection when typing
  selectedWorkspaceForAdd.value = null

  // Don't search for very short queries
  if (workspaceSearchQuery.value.trim().length < 2) {
    workspaceSearchResults.value = []
    return
  }

  // Set a timeout to avoid too many API calls
  searchTimeout.value = setTimeout(async () => {
    await searchWorkspaces()
  }, 300) // 300ms delay
}

async function searchWorkspaces() {
  if (!workspaceSearchQuery.value.trim() || workspaceSearchQuery.value.trim().length < 2) {
    workspaceSearchResults.value = []
    return
  }

  isSearchingWorkspaces.value = true
  try {
    const results = await usersStore.searchWorkspaces(workspaceSearchQuery.value.trim(), 10)

    // Filter out workspaces the user already has access to
    const userWorkspaceIds = userWorkspaces.value.map(uw => uw.id)
    workspaceSearchResults.value = results.filter(w => !userWorkspaceIds.includes(w.id))
  } catch (error) {
    console.error('Error searching workspaces:', error)
    workspaceSearchResults.value = []
  } finally {
    isSearchingWorkspaces.value = false
  }
}

function selectWorkspaceFromSearch(workspace) {
  selectedWorkspaceForAdd.value = workspace
  workspaceSearchQuery.value = workspace.name
  showWorkspaceResults.value = false
  workspaceSearchResults.value = []
}

function clearWorkspaceSelection() {
  selectedWorkspaceForAdd.value = null
  workspaceSearchQuery.value = ''
  workspaceSearchResults.value = []
}

function hideWorkspaceResults() {
  // Delay hiding to allow click events to register
  setTimeout(() => {
    showWorkspaceResults.value = false
  }, 200)
}

async function updateWorkspaceRole(workspaceId, newRole) {
  if (!props.user) return

  isUpdatingWorkspace.value = workspaceId
  try {
    await usersStore.updateUserWorkspaceRole(props.user.id, workspaceId, newRole)

    // Update local state
    const workspace = userWorkspaces.value.find(w => w.id === workspaceId)
    if (workspace) {
      workspace.role = newRole
    }

    successMessage.value = 'Workspace role updated successfully!'
    setTimeout(() => { successMessage.value = '' }, 3000)
  } catch (error) {
    console.error('Error updating workspace role:', error)
    errorMessage.value = error.message || 'Failed to update workspace role'
    setTimeout(() => { errorMessage.value = '' }, 5000)
  } finally {
    isUpdatingWorkspace.value = null
  }
}

async function removeFromWorkspace(workspaceId) {
  if (!props.user) return

  if (!confirm('Are you sure you want to remove this user from the workspace?')) {
    return
  }

  isUpdatingWorkspace.value = workspaceId
  try {
    await usersStore.removeUserFromWorkspace(props.user.id, workspaceId)

    // Remove from local state
    userWorkspaces.value = userWorkspaces.value.filter(w => w.id !== workspaceId)

    successMessage.value = 'User removed from workspace successfully!'
    setTimeout(() => { successMessage.value = '' }, 3000)
  } catch (error) {
    console.error('Error removing user from workspace:', error)
    errorMessage.value = error.message || 'Failed to remove user from workspace'
    setTimeout(() => { errorMessage.value = '' }, 5000)
  } finally {
    isUpdatingWorkspace.value = null
  }
}

async function addToWorkspace() {
  if (!props.user || !selectedWorkspaceForAdd.value) return

  isAddingToWorkspace.value = true
  try {
    await usersStore.addUserToWorkspace(props.user.id, selectedWorkspaceForAdd.value.id, newWorkspaceRole.value)

    // Add to local state
    userWorkspaces.value.push({
      ...selectedWorkspaceForAdd.value,
      role: newWorkspaceRole.value
    })

    // Reset form
    clearWorkspaceSelection()
    newWorkspaceRole.value = 'viewer'

    successMessage.value = 'User added to workspace successfully!'
    setTimeout(() => { successMessage.value = '' }, 3000)
  } catch (error) {
    console.error('Error adding user to workspace:', error)
    errorMessage.value = error.message || 'Failed to add user to workspace'
    setTimeout(() => { errorMessage.value = '' }, 5000)
  } finally {
    isAddingToWorkspace.value = false
  }
}

// Watch for modal visibility changes
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    // Add modal-open class to body when modal shows
    document.body.classList.add('modal-open')
    // Populate form with user data if editing
    if (props.user) {
      form.value = {
        username: props.user.username || '',
        password: '',
        confirmPassword: '',
        superadmin: props.user.superadmin || false,
        changePassword: false
      }
      // Load workspace data for editing
      loadWorkspaceData()
    } else {
      // Reset form for new user
      form.value = {
        username: '',
        password: '',
        confirmPassword: '',
        superadmin: false,
        changePassword: false
      }
      // Reset workspace data
      userWorkspaces.value = []
      clearWorkspaceSelection()
    }
    errors.value = {}
    errorMessage.value = ''
    successMessage.value = ''

    // Focus on username field
    nextTick(() => {
      usernameInput.value?.focus()
    })
  } else {
    // Remove modal-open class from body when modal hides
    document.body.classList.remove('modal-open')
    // Reset workspace form state
    clearWorkspaceSelection()
    newWorkspaceRole.value = 'viewer'
    isUpdatingWorkspace.value = null
    isAddingToWorkspace.value = false

    // Clear search timeout
    if (searchTimeout.value) {
      clearTimeout(searchTimeout.value)
      searchTimeout.value = null
    }
  }
})

// Watch for user prop changes
watch(() => props.user, () => {
  if (props.modelValue && props.user) {
    form.value = {
      username: props.user.username || '',
      password: '',
      confirmPassword: '',
      superadmin: props.user.superadmin || false,
      changePassword: false
    }
    // Load workspace data when user changes
    loadWorkspaceData()
  }
})

// Real-time validation
watch(() => form.value.username, validateForm)
watch(() => form.value.password, validateForm)
watch(() => form.value.confirmPassword, validateForm)
watch(() => form.value.changePassword, validateForm)
</script>
