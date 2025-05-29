<template>
  <!-- New/Edit Workspace Modal -->
  <div class="modal fade" id="workspaceModal" tabindex="-1" ref="modalElement">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">{{ isEditing ? 'Edit' : 'New' }} Workspace</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="handleSubmit">
            <div class="mb-3">
              <label for="workspaceName" class="form-label">Name</label>
              <input type="text" class="form-control" id="workspaceName" v-model="form.name" required
                :disabled="isLoading">
            </div>
            <div class="mb-3">
              <label for="workspaceDescription" class="form-label">Description</label>
              <textarea class="form-control" id="workspaceDescription" v-model="form.description" rows="3"
                :disabled="isLoading"></textarea>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" :disabled="isLoading">
            Cancel
          </button>
          <button type="button" class="btn btn-primary" @click="handleSubmit"
            :disabled="isLoading || !form.name.trim()">
            {{ isLoading ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * WorkspaceModal Component
 * 
 * A reusable modal component for creating and editing workspaces.
 * Handles form validation, submission, and provides a clean interface
 * for workspace management operations.
 * 
 * Features:
 * - Create new workspaces
 * - Edit existing workspaces
 * - Form validation (required name field)
 * - Loading states during save operations
 * - Bootstrap modal integration
 * - Accessible form controls
 * 
 * Events:
 * @event save - Emitted when form is submitted with valid data
 *   Payload: { name: string, description: string, id?: number }
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

import { ref, watch } from 'vue'
import { Modal } from 'bootstrap'

// Props
const props = defineProps({
  isLoading: {
    type: Boolean,
    default: false
  }
})

// Events
const emit = defineEmits(['save'])

// Template refs
const modalElement = ref(null)

// Component state
const form = ref({
  name: '',
  description: '',
  id: null
})

const isEditing = ref(false)

// Bootstrap modal instance
let bsModal = null

/**
 * Initialize Bootstrap modal when component mounts
 */
function initializeModal() {
  if (modalElement.value && !bsModal) {
    bsModal = new Modal(modalElement.value)
  }
}

/**
 * Shows the modal for creating a new workspace
 * Resets form data and sets editing mode to false
 */
function showNew() {
  initializeModal()
  form.value = { name: '', description: '', id: null }
  isEditing.value = false
  bsModal?.show()
}

/**
 * Shows the modal for editing an existing workspace
 * Pre-populates form with workspace data
 * 
 * @param {Object} workspace - Workspace object to edit
 * @param {number} workspace.id - Workspace ID
 * @param {string} workspace.name - Workspace name
 * @param {string} workspace.description - Workspace description
 */
function showEdit(workspace) {
  initializeModal()
  form.value = {
    name: workspace.name,
    description: workspace.description || '',
    id: workspace.id
  }
  isEditing.value = true
  bsModal?.show()
}

/**
 * Hides the modal
 */
function hide() {
  bsModal?.hide()
}

/**
 * Handles form submission
 * Validates required fields and emits save event with form data
 */
function handleSubmit() {
  if (!form.value.name.trim()) {
    return
  }

  const workspaceData = {
    name: form.value.name.trim(),
    description: form.value.description?.trim() || ''
  }

  if (isEditing.value && form.value.id) {
    workspaceData.id = form.value.id
  }

  emit('save', workspaceData)
}

// Expose methods for parent component access
defineExpose({
  showNew,
  showEdit,
  hide
})
</script>