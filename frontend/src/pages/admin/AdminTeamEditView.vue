<template>
  <AdminLayout>
    <div class="container-fluid py-4">
      <div class="row">
        <div class="col-12">
          <!-- Page Header -->
          <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 class="mb-0">{{ isCreating ? 'Create Team' : 'Edit Team' }}</h1>
              <nav aria-label="breadcrumb">
                <ol class="breadcrumb">
                  <li class="breadcrumb-item">
                    <RouterLink to="/admin">Admin</RouterLink>
                  </li>
                  <li class="breadcrumb-item">
                    <RouterLink to="/admin/teams">Teams</RouterLink>
                  </li>
                  <li class="breadcrumb-item active" aria-current="page">
                    {{ isCreating ? 'Create' : 'Edit' }}
                  </li>
                </ol>
              </nav>
            </div>
            <RouterLink to="/admin/teams" class="btn btn-outline-secondary">
              <i class="bi bi-arrow-left me-1"></i>
              Back to Teams
            </RouterLink>
          </div>

          <!-- Team Form Card -->
          <div class="card mb-4">
            <div class="card-header">
              <h5 class="card-title mb-0">
                {{ isCreating ? 'Create New Team' : 'Edit Team Details' }}
              </h5>
            </div>
            <div class="card-body">
              <form @submit.prevent="saveTeam">
                <!-- Team Name Field -->
                <div class="form-floating mb-3">
                  <input type="text" class="form-control" :class="{ 'is-invalid': errors.name }" id="teamName"
                    v-model="form.name" placeholder="Team Name" required :disabled="isSaving" ref="teamNameInput">
                  <label for="teamName">Team Name</label>
                  <div class="invalid-feedback" v-if="errors.name">
                    {{ errors.name }}
                  </div>
                </div>

                <!-- Submit Buttons -->
                <div class="d-flex justify-content-end gap-2">
                  <RouterLink to="/admin/teams" class="btn btn-outline-secondary">
                    Cancel
                  </RouterLink>
                  <button type="submit" class="btn btn-primary" :disabled="isSaving">
                    <span v-if="isSaving" class="spinner-border spinner-border-sm me-2" role="status"></span>
                    {{ isCreating ? 'Create Team' : 'Save Changes' }}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <!-- Team Members Section (only for edit mode) -->
          <div class="card mb-4" v-if="!isCreating && teamId">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h5 class="card-title mb-0">Team Members ({{ teamUsers.length }})</h5>
              <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addUserModal" :disabled="!!team?.deleted_at">
                <i class="bi bi-person-plus me-1"></i>
                Add Member
              </button>
            </div>
            <div class="card-body p-0">
              <div v-if="isLoadingMembers" class="p-4 text-center">
                <div class="spinner-border" role="status">
                  <span class="visually-hidden">Loading members...</span>
                </div>
              </div>
              <div v-else-if="teamUsers.length === 0" class="p-4 text-center">
                <p class="mb-0">No members in this team yet.</p>
              </div>
              <div v-else class="table-responsive">
                <table class="table table-hover mb-0">
                  <thead class="table-light">
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="user in teamUsers" :key="user.id">
                      <td>
                        <div class="d-flex align-items-center">
                          <div class="bg-primary user-avatar me-2">
                            <span class="text-white">{{ getUserInitials(user.username) }}</span>
                          </div>
                          <div>
                            <div class="fw-semibold">{{ user.username }}</div>
                            <small class="text-muted">User ID: {{ user.id }}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <select 
                          class="form-select form-select-sm" 
                          v-model="user.role"
                          @change="updateUserRole(user.id, user.role)"
                          :disabled="!!team?.deleted_at">
                          <option value="admin">Admin</option>
                          <option value="collaborator">Collaborator</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      </td>
                      <td>
                        <small>{{ formatDate(user.created_at) }}</small>
                      </td>
                      <td>
                        <button 
                          class="btn btn-sm btn-outline-danger" 
                          @click="removeUser(user)"
                          :disabled="!!team?.deleted_at">
                          <i class="bi bi-person-x"></i>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Team Books Section (only for edit mode) -->
          <div class="card" v-if="!isCreating && teamId">
            <div class="card-header">
              <h5 class="card-title mb-0">Team Books</h5>
            </div>
            <div class="card-body">
              <p class="mb-0">
                This team has {{ team?.book_count || 0 }} active {{ team?.book_count === 1 ? 'book' : 'books' }}.
                <br>
                <small class="text-muted">Note: As a superadmin, you can see the book count but need team access to view book details.</small>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add User Modal -->
    <div class="modal fade" id="addUserModal" tabindex="-1" aria-labelledby="addUserModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <!-- Modal Header -->
          <div class="modal-header">
            <h3 class="modal-title fs-5" id="addUserModalLabel">Add Member to {{ team?.name }}</h3>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>

          <!-- Modal Body -->
          <div class="modal-body">
            <form @submit.prevent="addUserToTeam">
              <!-- User Selection -->
              <div class="form-floating mb-3">
                <select class="form-select" id="selectedUserId" v-model="addUserForm.userId" required>
                  <option value="" disabled>Select a user</option>
                  <option v-for="user in availableUsers" :key="user.id" :value="user.id">
                    {{ user.username }}
                  </option>
                </select>
                <label for="selectedUserId">User</label>
              </div>
              
              <!-- Role Selection -->
              <div class="form-floating mb-3">
                <select class="form-select" id="selectedRole" v-model="addUserForm.role" required>
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
                <button type="submit" class="btn btn-primary" :disabled="isAddingUser">
                  <span v-if="isAddingUser" class="spinner-border spinner-border-sm me-2" role="status"></span>
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup>
/**
 * AdminTeamEditView Component
 * 
 * Administrative interface for creating or editing a team, including team member management.
 * This page handles both creating new teams and editing existing ones.
 * 
 * Features:
 * - Team creation and editing form
 * - Team member management interface (for existing teams)
 * - Team books display (for existing teams)
 * 
 * Security:
 * - Super admin access required (enforced by AdminLayout)
 * 
 * @component
 */

import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '../../layouts/AdminLayout.vue'
import { useTeamsStore } from '../../stores/teams'
import { useUsersStore } from '../../stores/users'
import { useConfirm } from '../../composables/useConfirm'
import { useToast } from '../../composables/useToast'

const route = useRoute()
const router = useRouter()
const teamsStore = useTeamsStore()
const usersStore = useUsersStore()
const { confirm } = useConfirm()
const { showToast } = useToast()

// Component state
const teamId = ref(null)
const team = ref(null)
const isCreating = computed(() => !teamId.value)
const isSaving = ref(false)
const isLoadingMembers = ref(false)
const isAddingUser = ref(false)
const teamUsers = ref([])
const modalInstance = ref(null)
const teamNameInput = ref(null)

// Form state
const form = ref({
  name: ''
})
const addUserForm = ref({
  userId: '',
  role: 'viewer'
})
const errors = ref({
  name: ''
})

// Computed properties
const availableUsers = computed(() => {
  // Filter out users that are already in the team
  const teamUserIds = teamUsers.value.map(user => user.id)
  return usersStore.users.filter(user => !teamUserIds.includes(user.id))
})

// Helper functions
function getUserInitials(username) {
  if (!username) return '?'
  return username
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

function formatDate(dateString) {
  if (!dateString) return 'Unknown'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Team management functions
async function saveTeam() {
  // Validate form
  errors.value = {
    name: ''
  }
  
  if (!form.value.name.trim()) {
    errors.value.name = 'Team name is required'
    return
  }
  
  isSaving.value = true
  
  try {
    if (isCreating.value) {
      // Create team
      const newTeam = await teamsStore.createTeam({
        name: form.value.name
      })
      
      showToast({
        title: 'Success',
        message: 'Team created successfully',
        variant: 'success'
      })
      
      // Navigate to edit view of the new team
      router.push(`/admin/teams/${newTeam.id}/edit`)
    } else {
      // Update team
      await teamsStore.updateTeam(teamId.value, {
        name: form.value.name
      })
      
      showToast({
        title: 'Success',
        message: 'Team updated successfully',
        variant: 'success'
      })
      
      // Reload team data
      await loadTeam()
    }
  } catch (error) {
    console.error('Error saving team:', error)
    
    if (error.message.includes('duplicate')) {
      errors.value.name = 'A team with this name already exists'
    } else {
      showToast({
        title: 'Error',
        message: `Error saving team: ${error.message}`,
        variant: 'danger'
      })
    }
  } finally {
    isSaving.value = false
  }
}

// User management functions
async function addUserToTeam() {
  if (!addUserForm.value.userId || !addUserForm.value.role) {
    showToast({
      title: 'Error',
      message: 'Please select a user and role',
      variant: 'danger'
    })
    return
  }
  
  isAddingUser.value = true
  
  try {
    await teamsStore.addUserToTeam(
      teamId.value,
      addUserForm.value.userId,
      addUserForm.value.role
    )
    
    showToast({
      title: 'Success',
      message: 'User added to team successfully',
      variant: 'success'
    })
    
    // Refresh team users
    await loadTeamUsers()
    
    // Close the modal using Bootstrap
    if (modalInstance.value) {
      modalInstance.value.hide()
    }
  } catch (error) {
    console.error('Error adding user to team:', error)
    showToast({
      title: 'Error',
      message: `Error adding user to team: ${error.message}`,
      variant: 'danger'
    })
  } finally {
    isAddingUser.value = false
  }
}

async function updateUserRole(userId, newRole) {
  try {
    await teamsStore.updateUserRole(teamId.value, userId, newRole)
    
    showToast({
      title: 'Success',
      message: 'User role updated successfully',
      variant: 'success'
    })
  } catch (error) {
    console.error('Error updating user role:', error)
    showToast({
      title: 'Error',
      message: `Error updating user role: ${error.message}`,
      variant: 'danger'
    })
    
    // Refresh team users to revert UI
    await loadTeamUsers()
  }
}

async function removeUser(user) {
  try {
    await confirm({
      title: 'Remove User',
      message: `Are you sure you want to remove user "${user.username}" from team "${team.value.name}"?`,
      confirmText: 'Remove',
      cancelText: 'Cancel',
      confirmButtonVariant: 'danger'
    })
    
    await teamsStore.removeUserFromTeam(teamId.value, user.id)
    
    showToast({
      title: 'Success',
      message: 'User removed from team successfully',
      variant: 'success'
    })
    
    // Refresh team users
    await loadTeamUsers()
  } catch (error) {
    if (error.message === 'User canceled') return
    
    console.error('Error removing user from team:', error)
    showToast({
      title: 'Error',
      message: `Error removing user from team: ${error.message}`,
      variant: 'danger'
    })
  }
}

// Data loading functions
async function loadTeam() {
  try {
    team.value = await teamsStore.fetchTeam(teamId.value)
    
    // Update form with team data
    form.value.name = team.value.name
  } catch (error) {
    console.error('Error loading team:', error)
    showToast({
      title: 'Error',
      message: `Error loading team: ${error.message}`,
      variant: 'danger'
    })
    
    // Navigate back to teams list on error
    router.push('/admin/teams')
  }
}

async function loadTeamUsers() {
  if (!teamId.value) return
  
  isLoadingMembers.value = true
  
  try {
    const users = await teamsStore.fetchTeamUsers(teamId.value)
    
    // Check if users is an array and has data
    if (!Array.isArray(users)) {
      console.error('Unexpected response from API:', users)
      throw new Error('Invalid response format from server')
    }
    
    teamUsers.value = users
  } catch (error) {
    console.error('Error loading team users:', error)
    showToast({
      title: 'Error',
      message: `Error loading team users: ${error.message}`,
      variant: 'danger'
    })
  } finally {
    isLoadingMembers.value = false
  }
}

// Book count is included in team data, no need for a separate function to load books

// Watch for route changes
watch(() => route.params.id, (newId) => {
  if (newId && newId !== 'create') {
    teamId.value = parseInt(newId)
    loadTeam()
    loadTeamUsers()
  } else {
    teamId.value = null
    team.value = null
    form.value.name = ''
  }
}, { immediate: true })

// Initialize component
onMounted(async () => {
  // Focus on the team name input
  nextTick(() => {
    if (teamNameInput.value) {
      teamNameInput.value.focus()
    }
  })
  
  // Initialize Bootstrap modal
  nextTick(() => {
    // Import Bootstrap's Modal class
    import('bootstrap').then(bootstrap => {
      // Initialize the modal
      const modalEl = document.getElementById('addUserModal')
      if (modalEl) {
        modalInstance.value = new bootstrap.Modal(modalEl)
        
        // Reset form when modal is hidden
        modalEl.addEventListener('hidden.bs.modal', () => {
          addUserForm.value = {
            userId: '',
            role: 'viewer'
          }
        })
      }
    })
  })
  
  // Load users for team member management
  if (usersStore.users.length === 0) {
    await usersStore.fetchAllUsers()
  }
})
</script>


