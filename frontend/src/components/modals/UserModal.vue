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
    } else {
      // Reset form for new user
      form.value = {
        username: '',
        password: '',
        confirmPassword: '',
        superadmin: false,
        changePassword: false
      }
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
  }
})

// Real-time validation
watch(() => form.value.username, validateForm)
watch(() => form.value.password, validateForm)
watch(() => form.value.confirmPassword, validateForm)
watch(() => form.value.changePassword, validateForm)
</script>
