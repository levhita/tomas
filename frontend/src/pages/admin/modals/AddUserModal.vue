<template>
  <!-- Add User Modal -->
  <div class="modal fade" id="addUserModal" tabindex="-1" aria-labelledby="addUserModalLabel" aria-hidden="true">
    <div class="modal-dialog">
      <div class="modal-content">
        <!-- Modal Header -->
        <div class="modal-header">
          <h3 class="modal-title fs-5" id="addUserModalLabel">Add Member to {{ teamName }}</h3>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>

        <!-- Modal Body -->
        <div class="modal-body">
          <form @submit.prevent="handleSubmit">
            <!-- User Search -->
            <div class="mb-3">
              <div class="form-floating">
                <input 
                  type="text" 
                  class="form-control" 
                  id="userSearch" 
                  v-model="searchQuery" 
                  @input="handleSearchInput"
                  placeholder="Search users..."
                  autocomplete="off"
                >
                <label for="userSearch">Search Users</label>
              </div>
              
              <!-- Search Results -->
              <div v-if="searchQuery.trim().length > 0" class="mt-2">
                <div v-if="isSearching" class="text-center py-2">
                  <div class="spinner-border spinner-border-sm" role="status">
                    <span class="visually-hidden">Searching...</span>
                  </div>
                  <span class="ms-2">Searching users...</span>
                </div>
                
                <div v-else-if="searchResults.length === 0" class="text-muted text-center py-2">
                  No users found matching "{{ searchQuery }}"
                </div>
                
                <div v-else class="list-group">
                  <button 
                    v-for="user in searchResults" 
                    :key="user.id" 
                    type="button"
                    class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                    :class="{ 
                      'active': form.userId === user.id,
                      'disabled': user.is_team_member
                    }"
                    @click="selectUser(user)"
                    :disabled="user.is_team_member"
                  >
                    <div class="d-flex align-items-center">
                      <div class="bg-primary user-avatar me-2">
                        <span class="text-white">{{ getUserInitials(user.username) }}</span>
                      </div>
                      <div>
                        <div class="fw-semibold">{{ user.username }}</div>
                        <small class="text-muted">User ID: {{ user.id }}</small>
                      </div>
                    </div>
                    <div class="d-flex gap-2">
                      <span v-if="user.superadmin" class="badge bg-warning">Super Admin</span>
                      <span v-if="user.is_team_member" class="badge bg-info">
                        Already Member ({{ user.team_role }})
                      </span>
                    </div>
                  </button>
                </div>
              </div>
              
              <!-- Selected User Display -->
              <div v-if="selectedUser" class="mt-3 p-3 bg-light rounded">
                <div class="d-flex justify-content-between align-items-center">
                  <div class="d-flex align-items-center">
                    <div class="bg-primary user-avatar me-2">
                      <span class="text-white">{{ getUserInitials(selectedUser.username) }}</span>
                    </div>
                    <div>
                      <div class="fw-semibold">{{ selectedUser.username }}</div>
                      <small class="text-muted">Selected User</small>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    class="btn btn-sm btn-outline-secondary"
                    @click="clearSelection"
                  >
                    <i class="bi bi-x"></i>
                  </button>
                </div>
              </div>
            </div>
            
            <!-- Role Selection -->
            <div class="form-floating mb-3">
              <select class="form-select" id="selectedRole" v-model="form.role" required>
                <option value="admin">Admin</option>
                <option value="collaborator">Collaborator</option>
                <option value="viewer">Viewer</option>
              </select>
              <label for="selectedRole">Role</label>
              <div class="form-text">
                <strong>Admin:</strong> Can manage team settings and members<br>
                <strong>Collaborator:</strong> Can edit books and transactions<br>
                <strong>Viewer:</strong> Can only view team content
              </div>
            </div>

            <!-- Submit Buttons -->
            <div class="d-flex justify-content-end gap-2">
              <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
                Cancel
              </button>
              <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
                <span v-if="isSubmitting" class="spinner-border spinner-border-sm me-2" role="status"></span>
                Add Member
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * AddUserModal Component
 * 
 * Modal component for adding a user to a team with role assignment.
 * This component handles the user selection and role assignment form.
 * 
 * Features:
 * - User selection from available users (excluding current team members)
 * - Role selection with descriptions
 * - Form validation and submission
 * - Loading state management
 * 
 * @component
 */

import { ref, computed, onMounted, nextTick } from 'vue'
import { useToast } from '../../../composables/useToast'
import { useUsersStore } from '../../../stores/users'

// Props
const props = defineProps({
  teamName: {
    type: String,
    required: true
  },
  teamId: {
    type: [Number, String],
    required: true
  },
  availableUsers: {
    type: Array,
    required: false,
    default: () => []
  },
  isSubmitting: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['submit'])

// Composables
const { showToast } = useToast()
const usersStore = useUsersStore()

// Component state
const modalInstance = ref(null)
const searchQuery = ref('')
const searchResults = ref([])
const isSearching = ref(false)
const searchTimeout = ref(null)
const selectedUser = ref(null)
const form = ref({
  userId: '',
  role: 'viewer'
})

// Methods
function getUserInitials(username) {
  if (!username) return '?'
  return username
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

function handleSearchInput() {
  // Clear previous timeout
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }
  
  // Debounce search
  searchTimeout.value = setTimeout(() => {
    performSearch()
  }, 300)
}

async function performSearch() {
  const query = searchQuery.value.trim()
  
  if (query.length < 1) {
    searchResults.value = []
    return
  }
  
  isSearching.value = true
  
  try {
    const results = await usersStore.searchUsers(query, 5, props.teamId)
    searchResults.value = results
  } catch (error) {
    console.error('Error searching users:', error)
    showToast({
      title: 'Error',
      message: 'Failed to search users',
      variant: 'danger'
    })
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
}

function selectUser(user) {
  // Prevent selecting users who are already team members
  if (user.is_team_member) {
    showToast({
      title: 'User Already Member',
      message: `${user.username} is already a member of this team with role: ${user.team_role}`,
      variant: 'info'
    })
    return
  }
  
  selectedUser.value = user
  form.value.userId = user.id
  searchQuery.value = ''
  searchResults.value = []
}

function clearSelection() {
  selectedUser.value = null
  form.value.userId = ''
  searchQuery.value = ''
  searchResults.value = []
}

function handleSubmit() {
  if (!form.value.userId || !form.value.role) {
    showToast({
      title: 'Error',
      message: 'Please select a user and role',
      variant: 'danger'
    })
    return
  }
  
  // Emit the submit event with form data
  emit('submit', {
    userId: form.value.userId,
    role: form.value.role
  })
}

function show() {
  if (modalInstance.value) {
    modalInstance.value.show()
  }
}

function hide() {
  if (modalInstance.value) {
    modalInstance.value.hide()
  }
}

function resetForm() {
  form.value = {
    userId: '',
    role: 'viewer'
  }
  searchQuery.value = ''
  searchResults.value = []
  selectedUser.value = null
  
  // Clear any pending search timeout
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
    searchTimeout.value = null
  }
}

// Expose methods to parent component
defineExpose({
  show,
  hide,
  resetForm
})

// Initialize component
onMounted(() => {
  nextTick(() => {
    // Import Bootstrap's Modal class
    import('bootstrap').then(bootstrap => {
      // Initialize the modal
      const modalEl = document.getElementById('addUserModal')
      if (modalEl) {
        modalInstance.value = new bootstrap.Modal(modalEl)
        
        // Reset form when modal is hidden
        modalEl.addEventListener('hidden.bs.modal', () => {
          resetForm()
        })
      }
    })
  })
})
</script>

<style scoped>
.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;
}

.list-group-item.active .user-avatar {
  background-color: rgba(255, 255, 255, 0.2) !important;
}

.bg-light .user-avatar {
  background-color: var(--bs-primary) !important;
}

.list-group-item.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.list-group-item.disabled:hover {
  background-color: transparent;
}
</style>
