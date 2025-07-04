<template>
  <AdminLayout>
    <div class="container-fluid py-4">
      <div class="row">
        <div class="col-12">
          <!-- Page Header -->
          <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 class="mb-0">
                <i class="bi bi-person me-2"></i>
                {{ isNew ? 'Create User' : 'Edit User' }}
              </h1>
              <nav aria-label="breadcrumb">
                <ol class="breadcrumb">
                  <li class="breadcrumb-item">
                    <RouterLink to="/admin">Admin</RouterLink>
                  </li>
                  <li class="breadcrumb-item">
                    <RouterLink to="/admin/users">Users</RouterLink>
                  </li>
                  <li class="breadcrumb-item active" aria-current="page">
                    {{ isNew ? 'Create User' : 'Edit User' }}
                  </li>
                </ol>
              </nav>
            </div>
            <div>
              <RouterLink to="/admin/users" class="btn btn-secondary me-2">
                <i class="bi bi-arrow-left me-1"></i>
                Back to Users
              </RouterLink>
            </div>
          </div>

          <!-- User Form Card -->
          <div class="card">
            <div class="card-body">
              <div v-if="isLoading" class="text-center py-5">
                <div class="spinner-border" role="status">
                  <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2 text-muted">Loading user data...</p>
              </div>
              
              <div v-else-if="error" class="alert alert-danger">
                <i class="bi bi-exclamation-triangle me-2"></i>
                {{ error }}
              </div>
              
              <form v-else @submit.prevent="saveUser">
                <!-- User Info Section -->
                <div class="row mb-4">
                  <div class="col-md-6">
                    <!-- Username Field -->
                    <div class="form-floating mb-3">
                      <input 
                        type="text" 
                        class="form-control" 
                        id="username" 
                        v-model="userData.username"
                        placeholder="Username"
                        required
                      >
                      <label for="username">Username</label>
                    </div>
                  </div>
                  
                  <div class="col-md-6">
                    <!-- Password Field -->
                    <div class="form-floating mb-3">
                      <input 
                        type="password" 
                        class="form-control" 
                        id="password" 
                        v-model="userData.password"
                        placeholder="Password"
                        :required="isNew"
                      >
                      <label for="password">{{ isNew ? 'Password' : 'New Password (leave blank to keep current)' }}</label>
                    </div>
                  </div>
                </div>

                <!-- Creation Date (only for existing users) -->
                <div class="row mb-4" v-if="!isNew && userData.created_at">
                  <div class="col-md-6">
                    <div class="form-floating mb-3">
                      <input 
                        type="text" 
                        class="form-control" 
                        id="createdAt" 
                        :value="formatDate(userData.created_at)"
                        readonly
                        disabled
                      >
                      <label for="createdAt">Account Created</label>
                    </div>
                  </div>
                </div>
                
                <!-- User Role & Status -->
                <div class="row mb-4">
                  <div class="col-md-6">
                    <!-- Super Admin Toggle -->
                    <div class="form-check form-switch mb-3">
                      <input 
                        class="form-check-input" 
                        type="checkbox" 
                        id="superadmin" 
                        v-model="userData.superadmin"
                      >
                      <label class="form-check-label" for="superadmin">
                        Super Administrator
                      </label>
                      <div class="form-text">
                        Super admins have full access to the admin dashboard and all system settings.
                      </div>
                    </div>
                  </div>
                  
                  <div class="col-md-6">
                    <!-- User Status -->
                    <div class="form-check form-switch mb-3">
                      <input 
                        class="form-check-input" 
                        type="checkbox" 
                        id="active" 
                        v-model="userData.active"
                      >
                      <label class="form-check-label" for="active">
                        Account Active
                      </label>
                      <div class="form-text">
                        Inactive accounts cannot log in to the system.
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- Submit Buttons -->
                <div class="d-flex justify-content-between">
                  <RouterLink to="/admin/users" class="btn btn-secondary">
                    Cancel
                  </RouterLink>
                  
                  <div>
                    <button 
                      type="submit" 
                      class="btn btn-primary"
                      :disabled="isSaving"
                    >
                      <span v-if="isSaving" class="spinner-border spinner-border-sm me-2"></span>
                      {{ isNew ? 'Create User' : 'Save Changes' }}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          <!-- User Teams Section (only for edit mode) -->
          <div class="card" v-if="!isNew && userId">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h5 class="card-title mb-0">User Teams ({{ userTeams.length }})</h5>
              <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addTeamModal">
                <i class="bi bi-people-fill me-1"></i>
                Add to Team
              </button>
            </div>
            <div class="card-body p-0">
              <div v-if="isLoadingTeams" class="p-4 text-center">
                <div class="spinner-border" role="status">
                  <span class="visually-hidden">Loading teams...</span>
                </div>
              </div>
              <div v-else-if="userTeams.length === 0" class="p-4 text-center">
                <p class="mb-0">This user is not a member of any teams yet.</p>
              </div>
              <div v-else class="table-responsive">
                <table class="table table-hover mb-0">
                  <thead class="table-light">
                    <tr>
                      <th>Team</th>
                      <th>Role</th>
                      <th>Joined</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="team in userTeams" :key="team.id">
                      <td>
                        <div class="d-flex align-items-center">
                          <div>
                            <div class="fw-semibold">{{ team.name }}</div>
                            <small class="text-muted">Team ID: {{ team.id }}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <select 
                          class="form-select form-select-sm" 
                          v-model="team.role"
                          @change="updateUserTeamRole(team.id, team.role)"
                          :disabled="!!team.deleted_at">
                          <option value="admin">Admin</option>
                          <option value="collaborator">Collaborator</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      </td>
                      <td>
                        <small>{{ formatDate(team.created_at) }}</small>
                      </td>
                      <td>
                        <span class="badge status-badge" :class="!team.deleted_at ? 'bg-success' : 'bg-danger'">
                          {{ !team.deleted_at ? 'Active' : 'Deleted' }}
                        </span>
                      </td>
                      <td>
                        <div class="d-flex gap-1">
                          <RouterLink 
                            :to="`/admin/teams/${team.id}/edit`" 
                            class="btn btn-sm btn-outline-primary"
                            title="Go to Team">
                            <i class="bi bi-box-arrow-up-right"></i>
                          </RouterLink>
                          <button 
                            class="btn btn-sm btn-outline-danger" 
                            @click="removeUserFromTeam(team)"
                            :disabled="!!team.deleted_at"
                            title="Remove from Team">
                            <i class="bi bi-person-x"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Team Modal -->
    <div class="modal fade" id="addTeamModal" tabindex="-1" aria-labelledby="addTeamModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <!-- Modal Header -->
          <div class="modal-header">
            <h3 class="modal-title fs-5" id="addTeamModalLabel">Add {{ userData.username }} to Team</h3>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>

          <!-- Modal Body -->
          <div class="modal-body">
            <form @submit.prevent="addUserToTeam">
              <!-- Team Selection -->
              <div class="form-floating mb-3">
                <select class="form-select" id="selectedTeamId" v-model="addTeamForm.teamId" required>
                  <option value="" disabled>Select a team</option>
                  <option v-for="team in availableTeams" :key="team.id" :value="team.id">
                    {{ team.name }}
                  </option>
                </select>
                <label for="selectedTeamId">Team</label>
              </div>
              
              <!-- Role Selection -->
              <div class="form-floating mb-3">
                <select class="form-select" id="selectedTeamRole" v-model="addTeamForm.role" required>
                  <option value="admin">Admin</option>
                  <option value="collaborator">Collaborator</option>
                  <option value="viewer">Viewer</option>
                </select>
                <label for="selectedTeamRole">Role</label>
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
                <button type="submit" class="btn btn-primary" :disabled="isAddingToTeam">
                  <span v-if="isAddingToTeam" class="spinner-border spinner-border-sm me-2" role="status"></span>
                  Add to Team
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
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUsersStore } from '../../stores/users'
import { useTeamsStore } from '../../stores/teams'
import { useToast } from '../../composables/useToast'
import { useConfirm } from '../../composables/useConfirm'
import AdminLayout from '../../layouts/AdminLayout.vue'

const route = useRoute()
const router = useRouter()
const usersStore = useUsersStore()
const teamsStore = useTeamsStore()
const { showToast } = useToast()
const { confirm } = useConfirm()

// State
const userData = ref({
  username: '',
  password: '',
  superadmin: false,
  active: true,
  created_at: null
})
const userTeams = ref([])
const isLoading = ref(false)
const isSaving = ref(false)
const isLoadingTeams = ref(false)
const isAddingToTeam = ref(false)
const error = ref(null)
const modalInstance = ref(null)

// Form state for adding user to team
const addTeamForm = ref({
  teamId: '',
  role: 'viewer'
})

// Computed
const userId = computed(() => route.params.id ? parseInt(route.params.id) : null)
const isNew = computed(() => !userId.value)

// Computed properties for team management
const availableTeams = computed(() => {
  // Filter out teams that the user is already a member of
  const userTeamIds = userTeams.value.map(team => team.id)
  return teamsStore.teams.filter(team => !userTeamIds.includes(team.id) && !team.deleted_at)
})

// Helper functions
function formatDate(dateString) {
  if (!dateString) return 'Unknown'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Load user data if editing existing user
onMounted(async () => {
  if (userId.value) {
    await loadUserData()
    await loadUserTeams()
  }
  
  // Initialize Bootstrap modal
  nextTick(() => {
    // Import Bootstrap's Modal class
    import('bootstrap').then(bootstrap => {
      // Initialize the modal
      const modalEl = document.getElementById('addTeamModal')
      if (modalEl) {
        modalInstance.value = new bootstrap.Modal(modalEl)
        
        // Reset form when modal is hidden
        modalEl.addEventListener('hidden.bs.modal', () => {
          addTeamForm.value = {
            teamId: '',
            role: 'viewer'
          }
        })
      }
    })
  })
  
  // Load teams for team management
  if (teamsStore.teams.length === 0) {
    await teamsStore.fetchAllTeams()
  }
})

async function loadUserData() {
  isLoading.value = true
  error.value = null
  
  try {
    const user = await usersStore.fetchUserById(userId.value)
    
    userData.value = {
      username: user.username || '',
      password: '', // Leave password empty when editing
      superadmin: user.superadmin || false,
      active: user.active !== false, // Default to true if not specified
      created_at: user.created_at || null
    }
  } catch (err) {
    console.error('Error loading user:', err)
    error.value = `Failed to load user: ${err.message}`
  } finally {
    isLoading.value = false
  }
}

async function saveUser() {
  isSaving.value = true
  error.value = null
  
  try {
    // Create data object, omitting password if it's empty on edit and created_at (read-only)
    const dataToSave = { ...userData.value }
    
    // Remove read-only fields
    delete dataToSave.created_at
    
    // Only include password if it's provided or if creating a new user
    if (!isNew.value && !dataToSave.password) {
      delete dataToSave.password
    }
    
    if (isNew.value) {
      await usersStore.createUser(dataToSave)
      showToast({
        title: 'Success',
        message: 'User created successfully',
        variant: 'success'
      })
    } else {
      await usersStore.updateUser(userId.value, dataToSave)
      showToast({
        title: 'Success',
        message: 'User updated successfully',
        variant: 'success'
      })
    }
    
    // Navigate back to users list
    router.push('/admin/users')
  } catch (err) {
    console.error('Error saving user:', err)
    error.value = `Failed to save user: ${err.message}`
    showToast({
      title: 'Error',
      message: `Failed to save user: ${err.message}`,
      variant: 'danger'
    })
  } finally {
    isSaving.value = false
  }
}

// Team management functions
async function loadUserTeams() {
  if (!userId.value) return
  
  isLoadingTeams.value = true
  
  try {
    // This would need to be implemented in the users store or teams store
    // For now, we'll use a placeholder approach
    const teams = await usersStore.fetchUserTeams(userId.value)
    
    if (!Array.isArray(teams)) {
      console.error('Unexpected response from API:', teams)
      throw new Error('Invalid response format from server')
    }
    
    userTeams.value = teams
  } catch (error) {
    console.error('Error loading user teams:', error)
    showToast({
      title: 'Error',
      message: `Error loading user teams: ${error.message}`,
      variant: 'danger'
    })
  } finally {
    isLoadingTeams.value = false
  }
}

async function addUserToTeam() {
  if (!addTeamForm.value.teamId || !addTeamForm.value.role) {
    showToast({
      title: 'Error',
      message: 'Please select a team and role',
      variant: 'danger'
    })
    return
  }
  
  isAddingToTeam.value = true
  
  try {
    await teamsStore.addUserToTeam(
      addTeamForm.value.teamId,
      userId.value,
      addTeamForm.value.role
    )
    
    showToast({
      title: 'Success',
      message: 'User added to team successfully',
      variant: 'success'
    })
    
    // Refresh user teams
    await loadUserTeams()
    
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
    isAddingToTeam.value = false
  }
}

async function updateUserTeamRole(teamId, newRole) {
  try {
    await teamsStore.updateUserRole(teamId, userId.value, newRole)
    
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
    
    // Refresh user teams to revert UI
    await loadUserTeams()
  }
}

async function removeUserFromTeam(team) {
  try {
    await confirm({
      title: 'Remove from Team',
      message: `Are you sure you want to remove "${userData.value.username}" from team "${team.name}"?`,
      confirmText: 'Remove',
      cancelText: 'Cancel',
      confirmButtonVariant: 'danger'
    })
    
    await teamsStore.removeUserFromTeam(team.id, userId.value)
    
    showToast({
      title: 'Success',
      message: 'User removed from team successfully',
      variant: 'success'
    })
    
    // Refresh user teams
    await loadUserTeams()
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
</script>
