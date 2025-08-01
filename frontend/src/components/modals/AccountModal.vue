<template>
  <!-- New/Edit Account Modal -->
  <div class="modal fade" :class="{ show: modelValue }" :style="{ display: modelValue ? 'block' : 'none' }"
    tabindex="-1" ref="modalElement">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">{{ isEditing ? 'Edit' : 'New' }} Account</h5>
          <button type="button" class="btn-close" aria-label="Close" @click="close"></button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="handleSubmit">
            <!-- Account Name -->
            <div class="mb-3 form-floating">
              <input type="text" class="form-control" id="accountName" v-model="form.name" required
                :disabled="isLoading" placeholder="e.g., Checking Account, Credit Card">
              <label for="accountName">Name *</label>
              <div class="form-text">A descriptive name for your account</div>
            </div>

            <!-- Account Note -->
            <div class="mb-3 form-floating">
              <textarea class="form-control" id="accountNote" v-model="form.note" rows="3" :disabled="isLoading"
                placeholder="Optional note about this account" style="height: 100px"></textarea>
              <label for="accountNote">Note</label>
              <div class="form-text">Additional information about this account</div>
            </div>

            <!-- Account Type -->
            <div class="mb-3 form-floating">
              <select class="form-select" id="accountType" v-model="form.type" :disabled="isLoading">
                <option value="debit">Debit Account</option>
                <option value="credit">Credit Account</option>
              </select>
              <label for="accountType">Account Type</label>
              <div class="form-text">
                <strong>Debit accounts:</strong> For bank accounts, cash, assets (positive balance is good)<br>
                <strong>Credit accounts:</strong> For credit cards, loans, debts (negative balance is good)
              </div>
            </div>

          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="close" :disabled="isLoading">
            Cancel
          </button>
          <button type="button" class="btn btn-primary" @click="handleSubmit" :disabled="isLoading || !form.name.trim()"
            data-testid="save-account-button">
            <span v-if="isLoading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"
              data-testid="loading-spinner"></span>
            {{ isLoading ? 'Saving...' : 'Save Account' }}
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
 * AccountModal Component
 * 
 * A modal component for creating and editing financial accounts.
 * Handles account properties including name, note, and account type
 * with form validation and proper handling of debit vs. credit accounts.
 * 
 * Features:
 * - Create new accounts with all configuration options
 * - Edit existing accounts with pre-populated data
 * - Form validation (required name field)
 * - Account type selection (debit or credit)
 * - Loading states during save operations
 * - Bootstrap modal integration with proper accessibility
 * - Responsive design for mobile and desktop
 * 
 * Account Fields:
 * - name: Required account name (string)
 * - note: Optional account description (string)
 * - type: Account type ('debit' or 'credit')
 * - workspace_id: The ID of the workspace this account belongs to
 * 
 * Events:
 * @event save - Emitted when form is submitted with valid data
 *   Payload: { name: string, note: string, type: string, id?: number, workspace_id: number }
 * 
 * Props:
 * @prop {boolean} modelValue - v-model value for showing/hiding the modal
 * @prop {Object} account - Account object for editing (optional)
 * @prop {number} workspaceId - ID of the workspace where account will be created
 * @prop {boolean} isLoading - Whether save operation is in progress
 * 
 * Usage:
 * <AccountModal 
 *   v-model="showAccountModal"
 *   :account="accountToEdit"
 *   :workspaceId="currentWorkspace.id"
 *   :isLoading="accountsStore.isLoading"
 *   @save="handleSaveAccount"
 * />
 * 
 * @component
 */

import { ref, computed, watch, onMounted } from 'vue'

// Props
const props = defineProps({
  /**
   * Controls the visibility of the modal dialog.
   * This prop is used with v-model for two-way binding:
   * - When true: the modal is displayed
   * - When false: the modal is hidden
   * 
   * The component emits 'update:modelValue' events to support v-model binding.
   * This follows Vue 3's v-model convention for custom components.
   */
  modelValue: Boolean,

  /**
   * Account object for editing an existing account.
   * When provided, the form is pre-populated with this account's data.
   * When null/undefined, the form is prepared for creating a new account.
   */
  account: Object,

  /**
   * ID of the workspace where the account will be created or exists.
   * Required for both new and existing accounts.
   */
  workspaceId: Number,

  /**
   * Indicates whether a save operation is in progress.
   * When true, form inputs are disabled and a spinner is shown on the save button.
   */
  isLoading: {
    type: Boolean,
    default: false
  }
})

// Events
const emit = defineEmits([
  /**
   * Emitted when the modal visibility should change.
   * This is part of the v-model implementation and follows Vue 3's conventions.
   * @param {boolean} value - The new visibility state (true = shown, false = hidden)
   */
  'update:modelValue',

  /**
   * Emitted when the form is submitted with valid data.
   * @param {Object} accountData - The account data to be saved
   * @param {string} accountData.name - The account name
   * @param {string} accountData.note - The account description/note
   * @param {string} accountData.type - The account type ('debit' or 'credit')
   * @param {number} accountData.workspace_id - The ID of the workspace
   * @param {number} [accountData.id] - The account ID (only for existing accounts)
   */
  'save'
])

// Template refs
const modalElement = ref(null)

// Computed property for normalized account type
const normalizedAccountType = computed(() => {
  // Always return either 'credit' or 'debit' 
  return props.account && props.account.type === 'credit' ? 'credit' : 'debit';
})

// Component state
const form = ref({
  name: '',
  note: '',
  type: 'debit', // Default to debit for new accounts
  id: null,
  workspace_id: props.workspaceId || null
})

const isEditing = computed(() => {
  return !!(props.account && props.account.id)
})

/**
 * Handles form submission
 * Validates required fields and emits save event with complete form data
 */
function handleSubmit() {
  // Validate required fields
  if (!form.value.name.trim()) {
    return
  }

  // Prepare account data with all fields
  const accountData = {
    name: form.value.name.trim(),
    note: form.value.note?.trim() || '',
    type: form.value.type || 'debit',
    workspace_id: form.value.workspace_id
  }

  // Include ID for edit operations
  if (isEditing.value && form.value.id) {
    accountData.id = form.value.id
  }

  // Make sure we have a workspace_id (should never happen with the other checks in place)
  if (accountData.workspace_id === undefined || accountData.workspace_id === null) {
    accountData.workspace_id = props.workspaceId;
  }

  emit('save', accountData)
}

/**
 * Close the modal
 */
function close() {
  emit('update:modelValue', false)
}

// Watch for account changes to update form data immediately
watch(() => props.account, (newAccount) => {
  if (newAccount) {
    const accountType = newAccount.type === 'credit' ? 'credit' : 'debit';

    // Preserve the account's original workspace_id if it exists
    const workspace_id = newAccount.workspace_id !== undefined && newAccount.workspace_id !== null
      ? newAccount.workspace_id  // Use the account's workspace_id
      : props.workspaceId;      // Fall back to prop only if account doesn't have one

    // Update form when account changes
    form.value = {
      name: newAccount.name || '',
      note: newAccount.note || '',
      type: accountType,
      id: newAccount.id,
      workspace_id: workspace_id
    }
  } else {
    // Reset form for new account
    form.value = {
      name: '',
      note: '',
      type: 'debit', // Default type for new accounts
      id: null,
      workspace_id: props.workspaceId
    }
  }
}, { immediate: true })

// Watch for modal visibility changes
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    // Show modal - add modal-open class to body 
    document.body.classList.add('modal-open')

    // Only set workspace_id if it's missing entirely
    if (form.value.workspace_id === undefined || form.value.workspace_id === null) {
      form.value.workspace_id = props.workspaceId;
    }
  } else {
    // Remove modal-open class from body when modal hides
    document.body.classList.remove('modal-open')
  }
})

// Initialize form data when component is mounted
onMounted(() => {
  // Check if we have an account to edit
  if (props.account) {
    // Preserve the account's original workspace_id if it exists
    const workspace_id = props.account.workspace_id !== undefined && props.account.workspace_id !== null
      ? props.account.workspace_id  // Use the account's workspace_id
      : props.workspaceId;         // Fall back to prop only if account doesn't have one

    form.value = {
      name: props.account.name || '',
      note: props.account.note || '',
      type: normalizedAccountType.value,
      id: props.account.id,
      workspace_id: workspace_id
    }
  } else {
    // Creating new account, ensure workspace_id is set
    form.value = {
      name: '',
      note: '',
      type: 'debit', // Default type for new accounts
      id: null,
      workspace_id: props.workspaceId
    }
  }
})
</script>
