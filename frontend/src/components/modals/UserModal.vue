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

            <!-- Active Status Toggle -->
            <div class="mb-3">
              <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" id="active" v-model="form.active" :disabled="isLoading">
                <label class="form-check-label" for="active">
                  Active User
                </label>
              </div>
              <div class="form-text">
                Inactive users cannot log in to the system
              </div>
            </div>

            <!-- Book Access Section (only for editing existing users) -->
            <div class="mb-3" v-if="isEditing">
              <h5 class="border-bottom pb-2 mb-3">
                <i class="bi bi-folder2 me-2"></i>Book Access
              </h5>

              <!-- Loading state -->
              <div v-if="isLoadingBooks" class="text-center py-3">
                <div class="spinner-border spinner-border-sm" role="status">
                  <span class="visually-hidden">Loading books...</span>
                </div>
                <small class="text-muted ms-2">Loading book information...</small>
              </div>

              <!-- Current book access -->
              <div v-else-if="userBooks.length > 0">
                <h6 class="text-muted mb-3">Current Access ({{ userBooks.length }})</h6>
                <div class="row g-2 mb-3">
                  <div v-for="book in userBooks" :key="book.id" class="col-12">
                    <div class="card card-body py-2">
                      <div class="d-flex justify-content-between align-items-center">
                        <div class="flex-grow-1">
                          <div class="fw-semibold">{{ book.name }}</div>
                          <small class="text-muted">{{ book.description || 'No description' }}</small>
                        </div>
                        <div class="d-flex align-items-center gap-2">
                          <!-- Role selector -->
                          <select class="form-select form-select-sm" :value="book.role"
                            @change="updateBookRole(book.id, $event.target.value)"
                            :disabled="isUpdatingBook === book.id" style="min-width: 110px;">
                            <option value="viewer">Viewer</option>
                            <option value="collaborator">Collaborator</option>
                            <option value="admin">Admin</option>
                          </select>
                          <!-- Remove button -->
                          <button type="button" class="btn btn-sm btn-outline-danger"
                            @click="removeFromBook(book.id)" :disabled="isUpdatingBook === book.id"
                            title="Remove from book">
                            <i class="bi bi-trash" v-if="isUpdatingBook !== book.id"></i>
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

              <!-- No book access -->
              <div v-else class="alert alert-info mb-3">
                <i class="bi bi-info-circle me-2"></i>
                This user doesn't have access to any books.
              </div>

              <!-- Add to book section -->
              <div class="border-top pt-3">
                <h6 class="text-muted mb-3">Add to Book</h6>
                <div class="row g-2">
                  <div class="col-12 col-md-6">
                    <div class="position-relative">
                      <input type="text" class="form-control" v-model="bookSearchQuery"
                        @input="onBookSearchInput" @focus="showBookResults = true"
                        @blur="hideBookResults" placeholder="Search book by name or ID..."
                        :disabled="isAddingToBook" autocomplete="off">

                      <!-- Search results dropdown -->
                      <div v-if="showBookResults && (bookSearchResults.length > 0 || isSearchingBooks)"
                        class="position-absolute w-100 bg-body border border-top-0 rounded-bottom shadow-sm"
                        style="z-index: 1050; max-height: 200px; overflow-y: auto;">

                        <!-- Loading state -->
                        <div v-if="isSearchingBooks" class="p-3 text-center">
                          <div class="spinner-border spinner-border-sm" role="status">
                            <span class="visually-hidden">Searching...</span>
                          </div>
                          <small class="text-muted ms-2">Searching books...</small>
                        </div>

                        <!-- Search results -->
                        <div v-else>
                          <button v-for="book in bookSearchResults" :key="book.id" type="button"
                            class="btn btn-link text-start w-100 border-0 rounded-0 p-3"
                            @mousedown="selectBookFromSearch(book)" style="text-decoration: none;">
                            <div class="fw-semibold">{{ book.name }}</div>
                            <small class="text-muted">ID: {{ book.id }} •
                              {{ book.description || 'No description' }}</small>
                          </button>

                          <!-- No results -->
                          <div v-if="bookSearchResults.length === 0 && bookSearchQuery.trim()"
                            class="p-3 text-center text-muted">
                            <i class="bi bi-search me-2"></i>No books found
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="col-12 col-md-4">
                    <select class="form-select" v-model="newBookRole" :disabled="isAddingToBook">
                      <option value="viewer">👁️ Viewer</option>
                      <option value="collaborator">✏️ Collaborator</option>
                      <option value="admin">🛡️ Admin</option>
                    </select>
                  </div>
                  <div class="col-12 col-md-2">
                    <button type="button" class="btn btn-success w-100" @click="addToBook"
                      :disabled="!selectedBookForAdd || isAddingToBook">
                      <span v-if="isAddingToBook" class="spinner-border spinner-border-sm me-2"
                        role="status"></span>
                      <i class="bi bi-plus-circle-fill" v-else></i>
                    </button>
                  </div>
                </div>

                <!-- Selected book preview -->
                <div v-if="selectedBookForAdd" class="mt-2">
                  <small class="text-muted">Selected: </small>
                  <span class="badge bg-primary">{{ selectedBookForAdd.name }}</span>
                  <button type="button" class="btn btn-sm btn-link text-danger p-0 ms-2"
                    @click="clearBookSelection" :disabled="isAddingToBook">
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
import { useConfirm } from '../../composables/useConfirm'

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
  active: true,
  changePassword: false
})

// Book management state
const userBooks = ref([])
const isLoadingBooks = ref(false)
const isUpdatingBook = ref(null)
const isAddingToBook = ref(false)
const newBookRole = ref('viewer')

// Book search state
const bookSearchQuery = ref('')
const bookSearchResults = ref([])
const isSearchingBooks = ref(false)
const showBookResults = ref(false)
const selectedBookForAdd = ref(null)
const searchTimeout = ref(null)

const errors = ref({})
const errorMessage = ref('')
const successMessage = ref('')
const isLoading = ref(false)

// Users store
const usersStore = useUsersStore()
const { confirm } = useConfirm()

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
      superadmin: form.value.superadmin,
      active: form.value.active
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

// Book management functions
async function loadBookData() {
  if (!props.user || !usersStore.isSuperAdmin) return

  isLoadingBooks.value = true
  try {
    // Only load user's current books
    const userWs = await usersStore.getUserBooks(props.user.id)
    userBooks.value = userWs
  } catch (error) {
    console.error('Error loading book data:', error)
    errorMessage.value = 'Failed to load book information'
  } finally {
    isLoadingBooks.value = false
  }
}

// Book search functions
function onBookSearchInput() {
  // Clear previous timeout
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }

  // Clear previous selection when typing
  selectedBookForAdd.value = null

  // Don't search for very short queries
  if (bookSearchQuery.value.trim().length < 2) {
    bookSearchResults.value = []
    return
  }

  // Set a timeout to avoid too many API calls
  searchTimeout.value = setTimeout(async () => {
    await searchBooks()
  }, 300) // 300ms delay
}

async function searchBooks() {
  if (!bookSearchQuery.value.trim() || bookSearchQuery.value.trim().length < 2) {
    bookSearchResults.value = []
    return
  }

  isSearchingBooks.value = true
  try {
    const results = await usersStore.searchBooks(bookSearchQuery.value.trim(), 10)

    // Filter out books the user already has access to
    const userBookIds = userBooks.value.map(uw => uw.id)
    bookSearchResults.value = results.filter(w => !userBookIds.includes(w.id))
  } catch (error) {
    console.error('Error searching books:', error)
    bookSearchResults.value = []
  } finally {
    isSearchingBooks.value = false
  }
}

function selectBookFromSearch(book) {
  selectedBookForAdd.value = book
  bookSearchQuery.value = book.name
  showBookResults.value = false
  bookSearchResults.value = []
}

function clearBookSelection() {
  selectedBookForAdd.value = null
  bookSearchQuery.value = ''
  bookSearchResults.value = []
}

function hideBookResults() {
  // Delay hiding to allow click events to register
  setTimeout(() => {
    showBookResults.value = false
  }, 200)
}

async function updateBookRole(bookId, newRole) {
  if (!props.user) return

  isUpdatingBook.value = bookId
  try {
    await usersStore.updateUserBookRole(props.user.id, bookId, newRole)

    // Update local state
    const book = userBooks.value.find(w => w.id === bookId)
    if (book) {
      book.role = newRole
    }

    successMessage.value = 'Book role updated successfully!'
    setTimeout(() => { successMessage.value = '' }, 3000)
  } catch (error) {
    console.error('Error updating book role:', error)
    errorMessage.value = error.message || 'Failed to update book role'
    setTimeout(() => { errorMessage.value = '' }, 5000)
  } finally {
    isUpdatingBook.value = null
  }
}

async function removeFromBook(bookId) {
  if (!props.user) return

  try {
    await confirm({
      title: 'Remove User',
      message: 'Are you sure you want to remove this user from the book?',
      confirmText: 'Remove',
      cancelText: 'Cancel',
      confirmButtonVariant: 'danger'
    })

    isUpdatingBook.value = bookId
    await usersStore.removeUserFromBook(props.user.id, bookId)

    // Remove from local state
    userBooks.value = userBooks.value.filter(w => w.id !== bookId)

    successMessage.value = 'User removed from book successfully!'
    setTimeout(() => { successMessage.value = '' }, 3000)
  } catch (error) {
    console.error('Error removing user from book:', error)
    errorMessage.value = error.message || 'Failed to remove user from book'
    setTimeout(() => { errorMessage.value = '' }, 5000)
  } finally {
    isUpdatingBook.value = null
  }
}

async function addToBook() {
  if (!props.user || !selectedBookForAdd.value) return

  isAddingToBook.value = true
  try {
    await usersStore.addUserToBook(props.user.id, selectedBookForAdd.value.id, newBookRole.value)

    // Add to local state
    userBooks.value.push({
      ...selectedBookForAdd.value,
      role: newBookRole.value
    })

    // Reset form
    clearBookSelection()
    newBookRole.value = 'viewer'

    successMessage.value = 'User added to book successfully!'
    setTimeout(() => { successMessage.value = '' }, 3000)
  } catch (error) {
    console.error('Error adding user to book:', error)
    errorMessage.value = error.message || 'Failed to add user to book'
    setTimeout(() => { errorMessage.value = '' }, 5000)
  } finally {
    isAddingToBook.value = false
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
        active: props.user.active !== false, // Ensure active is a boolean
        changePassword: false
      }
      // Load book data for editing
      loadBookData()
    } else {
      // Reset form for new user
      form.value = {
        username: '',
        password: '',
        confirmPassword: '',
        superadmin: false,
        active: true,
        changePassword: false
      }
      // Reset book data
      userBooks.value = []
      clearBookSelection()
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
    // Reset book form state
    clearBookSelection()
    newBookRole.value = 'viewer'
    isUpdatingBook.value = null
    isAddingToBook.value = false

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
      active: props.user.active !== false, // Ensure active is a boolean
      changePassword: false
    }
    // Load book data when user changes
    loadBookData()
  }
})

// Real-time validation
watch(() => form.value.username, validateForm)
watch(() => form.value.password, validateForm)
watch(() => form.value.confirmPassword, validateForm)
watch(() => form.value.changePassword, validateForm)
</script>
