<template>
  <!-- New/Edit Workspace Modal -->
  <div class="modal fade" :class="{ show: modelValue }" :style="{ display: modelValue ? 'block' : 'none' }"
    tabindex="-1" ref="modalElement">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">{{ isEditing ? 'Edit' : 'New' }} Workspace</h5>
          <button type="button" class="btn-close" aria-label="Close" @click="close"></button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="handleSubmit">
            <!-- Workspace Name -->
            <div class="mb-3">
              <label for="workspaceName" class="form-label">Name *</label>
              <input type="text" class="form-control" id="workspaceName" v-model="form.name" required
                :disabled="isLoading" placeholder="e.g., Personal Budget, Business Expenses">
              <div class="form-text">A descriptive name for your workspace</div>
            </div>

            <!-- Workspace Description -->
            <div class="mb-3">
              <label for="workspaceDescription" class="form-label">Description</label>
              <textarea class="form-control" id="workspaceDescription" v-model="form.description" rows="3"
                :disabled="isLoading"
                placeholder="Optional description of what this workspace is used for..."></textarea>
              <div class="form-text">Help others understand the purpose of this workspace</div>
            </div>

            <!-- Currency Symbol and Week Start Row -->
            <div class="row mb-3">
              <!-- Currency Symbol -->
              <div class="col-md-6">
                <label for="currencySymbol" class="form-label">Currency Symbol</label>
                <select class="form-select" id="currencySymbol" v-model="form.currency_symbol" :disabled="isLoading">
                  <option value="$">$ - US Dollar</option>
                  <option value="€">€ - Euro</option>
                  <option value="MXN">MXN - Mexican Peso</option>
                  <option value="£">£ - British Pound</option>
                  <option value="¥">¥ - Japanese Yen</option>
                  <option value="₹">₹ - Indian Rupee</option>
                  <option value="₽">₽ - Russian Ruble</option>
                  <option value="₦">₦ - Nigerian Naira</option>
                  <option value="R">R - South African Rand</option>
                  <option value="C$">C$ - Canadian Dollar</option>
                  <option value="A$">A$ - Australian Dollar</option>
                  <option value="¥">¥ - Chinese Yuan</option>
                  <option value="₩">₩ - South Korean Won</option>
                  <option value="₪">₪ - Israeli Shekel</option>
                  <option value="₱">₱ - Philippine Peso</option>
                  <option value="₫">₫ - Vietnamese Dong</option>
                  <option value="₡">₡ - Costa Rican Colón</option>
                  <option value="₨">₨ - Pakistani Rupee</option>
                  <option value="₴">₴ - Ukrainian Hryvnia</option>
                  <option value="₸">₸ - Kazakhstani Tenge</option>
                  <option value="₺">₺ - Turkish Lira</option>
                </select>
                <div class="form-text">Currency symbol used for all amounts</div>
              </div>

              <!-- Week Start -->
              <div class="col-md-6">
                <label for="weekStart" class="form-label">Week Starts On</label>
                <select class="form-select" id="weekStart" v-model="form.week_start" :disabled="isLoading">
                  <option value="sunday">Sunday</option>
                  <option value="monday">Monday</option>
                </select>
                <div class="form-text">First day of the week for calendar views</div>
              </div>
            </div>

          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="close" :disabled="isLoading">
            Cancel
          </button>
          <button type="button" class="btn btn-primary" @click="handleSubmit"
            :disabled="isLoading || !form.name.trim()">
            <span v-if="isLoading" class="spinner-border spinner-border-sm me-2" role="status"
              aria-hidden="true"></span>
            {{ isLoading ? 'Saving...' : 'Save Workspace' }}
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
 * WorkspaceModal Component
 * 
 * A comprehensive modal component for creating and editing workspaces.
 * Handles all workspace fields including name, description, currency symbol,
 * and week start preferences with form validation and preview functionality.
 * 
 * Features:
 * - Create new workspaces with all configuration options
 * - Edit existing workspaces with pre-populated data
 * - Form validation (required name field)
 * - Live preview of workspace settings
 * - Currency symbol selection with common currencies
 * - Week start day configuration for calendar views
 * - Loading states during save operations
 * - Bootstrap modal integration with proper accessibility
 * - Responsive design for mobile and desktop
 * 
 * Workspace Fields:
 * - name: Required workspace name (string)
 * - description: Optional workspace description (string)
 * - currency_symbol: Currency symbol for amounts (string, default: '$')
 * - week_start: First day of week for calendars (string, default: 'monday')
 * 
 * Events:
 * @event save - Emitted when form is submitted with valid data
 *   Payload: { name: string, description: string, currency_symbol: string, week_start: string, id?: number }
 * 
 * Props:
 * @prop {boolean} isLoading - Whether save operation is in progress
 * 
 * Usage:
 * <WorkspaceModal 
 *   :isLoading="workspacesStore.isLoading"
 *   @save="handleSave"
 *   ref="workspaceModal"
 * />
 * 
 * @component
 */

import { ref, computed, watch } from 'vue'

// Props
const props = defineProps({
  modelValue: Boolean,
  workspace: Object,
  isLoading: {
    type: Boolean,
    default: false
  }
})

// Events
const emit = defineEmits(['update:modelValue', 'save'])

// Template refs
const modalElement = ref(null)

// Component state
const form = ref({
  name: '',
  description: '',
  currency_symbol: '$',
  week_start: 'monday',
  id: null
})

const isEditing = computed(() => {
  return !!(props.workspace && props.workspace.id)
})

/**
 * Computed property to capitalize the first letter of a string
 * Used for displaying the week start day in a user-friendly format
 * 
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
const capitalizeFirst = computed(() => {
  return (str) => {
    if (!str) return ''
    return str.charAt(0).toUpperCase() + str.slice(1)
  }
})

/**
 * Handles form submission
 * Validates required fields and emits save event with complete form data
 * 
 * @function handleSubmit
 * @returns {void}
 */
function handleSubmit() {
  // Validate required fields
  if (!form.value.name.trim()) {
    return
  }

  // Prepare workspace data with all fields
  const workspaceData = {
    name: form.value.name.trim(),
    description: form.value.description?.trim() || '',
    currency_symbol: form.value.currency_symbol || '$',
    week_start: form.value.week_start || 'monday'
  }

  // Include ID for edit operations
  if (isEditing.value && form.value.id) {
    workspaceData.id = form.value.id
  }

  emit('save', workspaceData)
}

/**
 * Close the modal
 */
function close() {
  emit('update:modelValue', false)
}

// Watch for modal visibility changes
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    // Show modal - add modal-open class to body and populate form
    document.body.classList.add('modal-open')
    if (props.workspace) {
      // Editing existing workspace
      form.value = {
        name: props.workspace.name || '',
        description: props.workspace.description || '',
        currency_symbol: props.workspace.currency_symbol || '$',
        week_start: props.workspace.week_start || 'monday',
        id: props.workspace.id
      }
    } else {
      // Creating new workspace
      form.value = {
        name: '',
        description: '',
        currency_symbol: '$',
        week_start: 'monday',
        id: null
      }
    }
  } else {
    // Remove modal-open class from body when modal hides
    document.body.classList.remove('modal-open')
  }
})
</script>