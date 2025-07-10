<template>
  <div class="modal fade" id="addUserModal" tabindex="-1" ref="modal">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Add User to Team</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <!-- Username Input -->
          <div class="mb-3">
            <label for="username" class="form-label">Username</label>
            <div class="form-floating">
              <input
                id="username"
                type="text"
                class="form-control"
                v-model="username"
                placeholder="Enter username"
                :disabled="isLoading"
                required
              />
              <label for="username">Enter username</label>
            </div>
            <div class="form-text">
              Enter the exact username of the user you want to add to the team.
            </div>
          </div>

          <!-- Role Selection -->
          <div class="mb-3">
            <label for="userRole" class="form-label">Select Role</label>
            <select id="userRole" class="form-select" v-model="selectedRole">
              <option value="viewer">Viewer - Can view data only</option>
              <option value="collaborator">Collaborator - Can view and edit data</option>
              <option value="admin">Admin - Full access including team management</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
          <button 
            type="button" 
            class="btn btn-primary" 
            @click="addUser"
            :disabled="!username.trim() || isLoading"
          >
            {{ isLoading ? 'Adding...' : 'Add User' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from 'vue';
import { Modal } from 'bootstrap';
import fetchWithAuth from '../../utils/fetch';
import { useToast } from '../../composables/useToast';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  teamId: {
    type: Number,
    required: true
  }
});

const emit = defineEmits(['update:modelValue', 'user-added']);

const { showToast } = useToast();

// Component state
const modal = ref(null);
const username = ref('');
const selectedRole = ref('viewer');
const isLoading = ref(false);

let bsModal = null;

onMounted(() => {
  bsModal = new Modal(modal.value);
  
  // Listen for modal events
  modal.value.addEventListener('hidden.bs.modal', () => {
    emit('update:modelValue', false);
    resetForm();
  });
});

watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    bsModal.show();
  } else {
    bsModal.hide();
  }
});

function resetForm() {
  username.value = '';
  selectedRole.value = 'viewer';
  isLoading.value = false;
}

async function addUser() {
  if (!username.value.trim() || !props.teamId) return;

  try {
    isLoading.value = true;

    const response = await fetchWithAuth(`/api/teams/${props.teamId}/users/add-by-username`, {
      method: 'POST',
      body: JSON.stringify({
        username: username.value.trim(),
        role: selectedRole.value
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to add user');
    }

    emit('user-added');
    emit('update:modelValue', false);
  } catch (error) {
    console.error('Error adding user to team:', error);
    showToast({
      title: 'Error',
      message: `Failed to add user: ${error.message}`,
      variant: 'danger'
    });
  } finally {
    isLoading.value = false;
  }
}
</script>
