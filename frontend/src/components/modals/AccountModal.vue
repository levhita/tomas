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
          <button type="button" class="btn btn-primary" @click="handleSubmit"
            :disabled="isLoading || !form.name.trim()">
            <span v-if="isLoading" class="spinner-border spinner-border-sm me-2" role="status"
              aria-hidden="true"></span>
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

import { ref, computed, watch } from 'vue'

// Props
const props = defineProps({
  modelValue: Boolean,
  account: Object,
  workspaceId: Number,
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
  note: '',
  type: 'debit',
  id: null,
  workspace_id: null
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

  emit('save', accountData)
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

    if (props.account) {
      // Editing existing account
      form.value = {
        name: props.account.name || '',
        note: props.account.note || '',
        type: props.account.type || 'debit',
        id: props.account.id,
        workspace_id: props.account.workspace_id
      }
    } else {
      // Creating new account
      form.value = {
        name: '',
        note: '',
        type: 'debit',
        id: null,
        workspace_id: props.workspaceId
      }
    }
  } else {
    // Remove modal-open class from body when modal hides
    document.body.classList.remove('modal-open')
  }
})
</script>
