<template>
  <!-- Bootstrap Modal Container -->
  <div class="modal fade" :class="{ show: modelValue }" :style="{ display: modelValue ? 'block' : 'none' }"
    tabindex="-1" ref="modalElement">
    <div class="modal-dialog">
      <div class="modal-content">
        <!-- Modal Header -->
        <div class="modal-header">
          <h3 class="modal-title">User Profile</h3>
          <button type="button" class="btn-close" aria-label="Close" @click="close"></button>
        </div>

        <!-- Modal Body -->
        <div class="modal-body">
          <form @submit.prevent="save">
            <!-- Username Field -->
            <div class="form-floating mb-3">
              <input type="text" class="form-control" :class="{ 'is-invalid': errors.username }" id="profileUsername"
                v-model="form.username" placeholder="Username" required :disabled="isLoading" ref="usernameInput"
                autocomplete="username">
              <label for="profileUsername">Username</label>
              <div class="invalid-feedback" v-if="errors.username">
                {{ errors.username }}
              </div>
            </div>

            <!-- Change Password Toggle -->
            <div class="mb-3">
              <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" id="changePassword" v-model="form.changePassword"
                  :disabled="isLoading">
                <label class="form-check-label" for="changePassword">
                  <i class="bi bi-key me-1"></i>
                  Change Password
                </label>
              </div>
              <div class="form-text">
                Check this box to update your password
              </div>
            </div>

            <!-- Current Password Field (required when changing password) -->
            <div class="form-floating mb-3" v-if="form.changePassword">
              <input type="password" class="form-control" :class="{ 'is-invalid': errors.currentPassword }"
                id="currentPassword" v-model="form.currentPassword" placeholder="Current Password"
                :required="form.changePassword" :disabled="isLoading" autocomplete="current-password">
              <label for="currentPassword">Current Password</label>
              <div class="invalid-feedback" v-if="errors.currentPassword">
                {{ errors.currentPassword }}
              </div>
              <div class="form-text">
                Enter your current password to confirm the change
              </div>
            </div>

            <!-- New Password Field -->
            <div class="form-floating mb-3" v-if="form.changePassword">
              <input type="password" class="form-control" :class="{ 'is-invalid': errors.password }" id="newPassword"
                v-model="form.password" placeholder="New Password" :required="form.changePassword" :disabled="isLoading"
                autocomplete="new-password">
              <label for="newPassword">New Password</label>
              <div class="invalid-feedback" v-if="errors.password">
                {{ errors.password }}
              </div>
            </div>

            <!-- Confirm New Password Field -->
            <div class="form-floating mb-3" v-if="form.changePassword">
              <input type="password" class="form-control" :class="{ 'is-invalid': errors.confirmPassword }"
                id="confirmPassword" v-model="form.confirmPassword" placeholder="Confirm New Password"
                :required="form.changePassword" :disabled="isLoading" autocomplete="new-password">
              <label for="confirmPassword">Confirm New Password</label>
              <div class="invalid-feedback" v-if="errors.confirmPassword">
                {{ errors.confirmPassword }}
              </div>
            </div>

            <!-- Error Display -->
            <div class="alert alert-danger" v-if="errorMessage">
              <i class="bi bi-exclamation-triangle me-2"></i>
              {{ errorMessage }}
            </div>

            <!-- Success Display -->
            <div class="alert alert-success" v-if="successMessage">
              <i class="bi bi-check-circle me-2"></i>
              {{ successMessage }}
            </div>
          </form>
        </div>

        <!-- Modal Footer -->
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="close" :disabled="isLoading">
            <i class="bi bi-x-circle me-1"></i>
            Cancel
          </button>
          <button type="submit" class="btn btn-primary" :disabled="isLoading || !isFormValid">
            <span v-if="isLoading" class="spinner-border spinner-border-sm me-2" role="status"
              aria-hidden="true"></span>
            <i class="bi bi-check-lg me-1" v-else></i>
            {{ isLoading ? 'Saving...' : 'Save Changes' }}
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
 * UserProfileModal Component
 * 
 * A modal component for users to edit their own profile information.
 * Allows users to update their username and password with proper validation.
 * 
 * Features:
 * - Update username
 * - Change password with current password verification
 * - Real-time form validation with error feedback
 * - Password confirmation validation
 * - Bootstrap modal integration with proper accessibility
 * - Error and success message display
 * - Loading states during API calls
 * - Focus management and keyboard navigation
 * 
 * Props:
 * @prop {boolean} modelValue - Controls modal visibility
 * 
 * Events:
 * @event update:modelValue - Emitted when modal visibility should change
 * @event save - Emitted when profile is successfully updated
 * 
 * @component
 */

import { ref, computed, watch, nextTick } from 'vue'
import { useUsersStore } from '../../stores/users'

const props = defineProps({
  modelValue: Boolean
})

const emit = defineEmits(['update:modelValue', 'save'])

// Template refs
const usernameInput = ref(null)
const modalElement = ref(null)

// Users store
const usersStore = useUsersStore()

// Form state
const form = ref({
  username: '',
  currentPassword: '',
  password: '',
  confirmPassword: '',
  changePassword: false
})

// Component state
const errors = ref({})
const errorMessage = ref('')
const successMessage = ref('')
const isLoading = ref(false)

// Computed properties
const isFormValid = computed(() => {
  if (!form.value.username.trim()) return false

  // If changing password, validate password fields
  if (form.value.changePassword) {
    if (!form.value.currentPassword) return false
    if (!form.value.password) return false
    if (form.value.password !== form.value.confirmPassword) return false
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

  // Password validation (only when changing password)
  if (form.value.changePassword) {
    // Current password validation
    if (!form.value.currentPassword) {
      errors.value.currentPassword = 'Current password is required'
    }

    // New password validation
    if (!form.value.password) {
      errors.value.password = 'New password is required'
    } else if (form.value.password.length < 6) {
      errors.value.password = 'Password must be at least 6 characters'
    } else if (form.value.password.length > 100) {
      errors.value.password = 'Password must be less than 100 characters'
    }

    // Confirm password validation
    if (form.value.password && form.value.password !== form.value.confirmPassword) {
      errors.value.confirmPassword = 'Passwords do not match'
    }

    // Check if new password is different from current
    if (form.value.password && form.value.password === form.value.currentPassword) {
      errors.value.password = 'New password must be different from current password'
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
      username: form.value.username.trim()
    }

    // Only include password if changing it
    if (form.value.changePassword && form.value.password) {
      userData.password = form.value.password
      userData.currentPassword = form.value.currentPassword
    }

    // Update current user's profile
    await usersStore.updateUser(usersStore.currentUser.id, userData)

    successMessage.value = 'Profile updated successfully!'

    // Emit success event
    emit('save')

    // Close modal after a short delay to show success message
    setTimeout(() => {
      close()
    }, 1500)

  } catch (error) {
    console.error('Profile update error:', error)

    // Handle specific error cases
    if (error.message.includes('current password')) {
      errors.value.currentPassword = 'Current password is incorrect'
    } else if (error.message.includes('Username already exists')) {
      errors.value.username = 'This username is already taken'
    } else {
      errorMessage.value = error.message || 'An error occurred while updating your profile'
    }
  } finally {
    isLoading.value = false
  }
}

function close() {
  emit('update:modelValue', false)
}

function resetForm() {
  form.value = {
    username: usersStore.currentUser?.username || '',
    currentPassword: '',
    password: '',
    confirmPassword: '',
    changePassword: false
  }
  errors.value = {}
  errorMessage.value = ''
  successMessage.value = ''
}

// Watch for modal visibility changes
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    // Show modal - add modal-open class to body and reset form
    document.body.classList.add('modal-open')
    resetForm()

    // Focus on username field
    nextTick(() => {
      usernameInput.value?.focus()
    })
  } else {
    // Remove modal-open class from body when modal hides
    document.body.classList.remove('modal-open')
  }
})

// Real-time validation
watch(() => form.value.username, validateForm)
watch(() => form.value.currentPassword, validateForm)
watch(() => form.value.password, validateForm)
watch(() => form.value.confirmPassword, validateForm)
watch(() => form.value.changePassword, () => {
  // Clear password fields when toggle is turned off
  if (!form.value.changePassword) {
    form.value.currentPassword = ''
    form.value.password = ''
    form.value.confirmPassword = ''
  }
  validateForm()
})
</script>
