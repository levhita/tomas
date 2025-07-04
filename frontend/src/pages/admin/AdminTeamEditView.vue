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
            <div class="d-flex gap-2">
              <RouterLink to="/admin/teams" class="btn btn-secondary">
                <i class="bi bi-arrow-left me-1"></i>
                Back to Teams
              </RouterLink>
              <button 
                v-if="!isCreating && !team?.deleted_at" 
                class="btn btn-outline-danger" 
                @click="deleteTeam"
                :disabled="isSaving">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>

          <!-- Team Form Card -->
          <div class="card mb-4">
            <div class="card-header">
              <h5 class="card-title mb-0">
                {{ isCreating ? 'Create New Team' : 'Edit Team Details' }}
              </h5>
            </div>
            <div class="card-body">
              <!-- Deleted Team Warning -->
              <div v-if="team?.deleted_at" class="alert alert-warning mb-3" role="alert">
                <i class="bi bi-exclamation-triangle me-2"></i>
                <strong>Deleted Team</strong> - This team was deleted on {{ formatDate(team.deleted_at) }}. 
                Team members cannot access this team's content until it is restored.
                <div class="mt-2 d-flex gap-2">
                  <RouterLink to="/admin/teams" class="btn btn-secondary">
                    Cancel
                  </RouterLink>
                  <button class="btn btn-sm btn-success" @click="restoreTeam" :disabled="isSaving">
                    <i class="bi bi-arrow-counterclockwise me-1"></i>
                    Restore Team
                  </button>
                  <button class="btn btn-sm btn-danger" @click="permanentlyDeleteTeam" :disabled="isSaving">
                    <i class="bi bi-trash3 me-1"></i>
                    Delete Permanently
                  </button>
                </div>
              </div>

              <form @submit.prevent="saveTeam">
                <!-- Team Name Field -->
                <div class="d-flex gap-2 mb-3">
                  <div class="form-floating flex-grow-1">
                    <input type="text" class="form-control" :class="{ 'is-invalid': errors.name }" id="teamName"
                      v-model="form.name" placeholder="Team Name" required :disabled="isSaving || !!team?.deleted_at" ref="teamNameInput">
                    <label for="teamName">Team Name</label>
                    <div class="invalid-feedback" v-if="errors.name">
                      {{ errors.name }}
                    </div>
                  </div>
                  <button type="submit" class="btn btn-primary align-self-start" :disabled="isSaving || !!team?.deleted_at">
                    <span v-if="isSaving" class="spinner-border spinner-border-sm me-2" role="status"></span>
                    {{ isCreating ? 'Create Team' : 'Update Name' }}
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
              <!-- Deleted Team Info -->
              <div v-if="team?.deleted_at" class="alert alert-info mx-3 mt-3 mb-0" role="alert">
                <i class="bi bi-info-circle me-2"></i>
                <strong>Note:</strong> Member management is disabled for deleted teams. 
                Restore the team to enable adding/removing members and changing roles.
              </div>
              
              <div v-if="isLoadingMembers" class="p-4 text-center">
                <div class="spinner-border" role="status">
                  <span class="visually-hidden">Loading members...</span>
                </div>
              </div>
              <div v-else-if="teamUsers.length === 0" class="p-4 text-center">
                <p class="mb-0">No members in this team yet.</p>
              </div>
              <div v-else class="table-responsive">
                <table class="table table-hover mb-0" :class="{ 'table-muted': !!team?.deleted_at }">
                  <thead class="table">
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Status</th>
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
                        <span 
                          class="badge" 
                          :class="user.active ? 'bg-success' : 'bg-danger'">
                          {{ user.active ? 'Active' : 'Inactive' }}
                        </span>
                      </td>
                      <td>
                        <small>{{ formatDate(user.created_at) }}</small>
                      </td>
                      <td>
                        <div class="d-flex gap-1">
                          <RouterLink 
                            :to="`/admin/users/${user.id}/edit`" 
                            class="btn btn-sm btn-outline-primary"
                            title="Go to User">
                            <i class="bi bi-person"></i>
                          </RouterLink>
                          <button 
                            class="btn btn-sm btn-outline-danger" 
                            @click="removeUser(user)"
                            :disabled="!!team?.deleted_at"
                            title="Remove User">
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
    <AddUserModal
      :team-name="team?.name || ''"
      :team-id="teamId || 0"
      :is-submitting="isAddingUser"
      @submit="addUserToTeam"
      ref="addUserModal"
    />
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
import AddUserModal from './modals/AddUserModal.vue'
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
const addUserModal = ref(null)
const teamNameInput = ref(null)

// Form state
const form = ref({
  name: ''
})
const errors = ref({
  name: ''
})

// Computed properties
// Note: availableUsers is no longer used since we now use search instead of loading all users

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

async function restoreTeam() {
  try {
    await confirm({
      title: 'Restore Team',
      message: `Are you sure you want to restore team "${team.value.name}"?`,
      confirmText: 'Restore',
      cancelText: 'Cancel',
      confirmButtonVariant: 'success'
    })
    
    isSaving.value = true
    
    // Restore team using the dedicated restore endpoint
    await teamsStore.restoreTeam(teamId.value)
    
    showToast({
      title: 'Success',
      message: 'Team restored successfully!',
      variant: 'success'
    })
    
    // Reload team data
    await loadTeam()
  } catch (error) {
    if (error.message === 'User canceled') return
    
    console.error('Error restoring team:', error)
    showToast({
      title: 'Error',
      message: `Error restoring team: ${error.message}`,
      variant: 'danger'
    })
  } finally {
    isSaving.value = false
  }
}

async function permanentlyDeleteTeam() {
  try {
    await confirm({
      title: 'Permanently Delete Team',
      message: `Are you sure you want to permanently delete team "${team.value.name}"? This action cannot be undone and will remove all team data including books, transactions, and member associations.`,
      confirmText: 'Delete Permanently',
      cancelText: 'Cancel',
      confirmButtonVariant: 'danger'
    })
    
    isSaving.value = true
    
    // Permanently delete team
    await teamsStore.permanentlyDeleteTeam(teamId.value)
    
    showToast({
      title: 'Success',
      message: 'Team permanently deleted successfully!',
      variant: 'success'
    })
    
    // Navigate back to teams list
    router.push('/admin/teams')
  } catch (error) {
    if (error.message === 'User canceled') return
    
    console.error('Error permanently deleting team:', error)
    showToast({
      title: 'Error',
      message: `Error permanently deleting team: ${error.message}`,
      variant: 'danger'
    })
  } finally {
    isSaving.value = false
  }
}

async function deleteTeam() {
  try {
    await confirm({
      title: 'Delete Team',
      message: `Are you sure you want to delete team "${team.value.name}"? This will soft-delete the team and members will lose access to it. The team can be restored later from the admin panel.`,
      confirmText: 'Delete Team',
      cancelText: 'Cancel',
      confirmButtonVariant: 'danger'
    })
    
    isSaving.value = true
    
    // Soft delete team
    await teamsStore.deleteTeam(teamId.value)
    
    showToast({
      title: 'Success',
      message: 'Team deleted successfully!',
      variant: 'success'
    })
    
    // Reload team data to show deleted state
    await loadTeam()
  } catch (error) {
    if (error.message === 'User canceled') return
    
    console.error('Error deleting team:', error)
    showToast({
      title: 'Error',
      message: `Error deleting team: ${error.message}`,
      variant: 'danger'
    })
  } finally {
    isSaving.value = false
  }
}

// User management functions
async function addUserToTeam(formData) {
  if (!formData.userId || !formData.role) {
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
      formData.userId,
      formData.role
    )
    
    showToast({
      title: 'Success',
      message: 'User added to team successfully',
      variant: 'success'
    })
    
    // Refresh team users
    await loadTeamUsers()
    
    // Close the modal
    if (addUserModal.value) {
      addUserModal.value.hide()
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
  
  // Note: No longer loading all users since we use search instead
})
</script>


