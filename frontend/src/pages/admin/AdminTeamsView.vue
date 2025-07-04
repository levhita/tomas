<template>
  <AdminLayout>
    <div class="container-fluid py-4">
      <div class="row">
        <div class="col-12">
          <!-- Page Header -->
          <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 class="mb-0">Team Management</h1>
              <nav aria-label="breadcrumb">
                <ol class="breadcrumb">
                  <li class="breadcrumb-item">
                    <RouterLink to="/admin">Admin</RouterLink>
                  </li>
                  <li class="breadcrumb-item active" aria-current="page">Teams</li>
                </ol>
              </nav>
            </div>
            <RouterLink to="/admin/teams/create" class="btn btn-primary">
              <i class="bi bi-people-fill me-1"></i>
              Add Team
            </RouterLink>
          </div>

          <!-- Search and Filters -->
          <div class="card mb-4">
            <div class="card-body">
              <div class="row">
                <div class="col-md-6">
                  <div class="form-floating">
                    <input type="text" class="form-control" id="searchTeams" v-model="searchQuery"
                      placeholder="Search teams...">
                    <label for="searchTeams">Search teams by name</label>
                  </div>
                </div>
                <div class="col-md-3">
                  <div class="form-floating">
                    <select class="form-select" id="filterStatus" v-model="filterStatus">
                      <option value="">All Status</option>
                      <option value="active">Active</option>
                      <option value="deleted">Deleted</option>
                    </select>
                    <label for="filterStatus">Filter by Status</label>
                  </div>
                </div>
                <div class="col-md-3">
                  <div class="form-floating">
                    <select class="form-select" id="sortBy" v-model="sortBy">
                      <option value="name">Name</option>
                      <option value="created_at">Date Created</option>
                      <option value="user_count">User Count</option>
                    </select>
                    <label for="sortBy">Sort by</label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Teams Table -->
          <div class="card admin-table">
            <div class="card-header">
              <h5 class="card-title mb-0">
                Teams ({{ filteredTeams.length }})
              </h5>
            </div>
            <div class="card-body p-0">
              <div v-if="teamsStore.isLoadingTeams" class="admin-loading">
                <div class="spinner-border" role="status">
                  <span class="visually-hidden">Loading teams...</span>
                </div>
              </div>

              <div v-else-if="filteredTeams.length === 0" class="admin-empty-state">
                <i class="bi bi-people"></i>
                <p class="mb-0">No teams found</p>
                <small v-if="searchQuery || filterStatus">
                  Try adjusting your search criteria
                </small>
                <RouterLink v-else to="/admin/teams/create" class="btn btn-primary mt-3">
                  <i class="bi bi-people-fill me-1"></i>
                  Create First Team
                </RouterLink>
              </div>

              <div v-else class="table-responsive">
                <table class="table table-hover mb-0">
                  <thead class="table-light">
                    <tr>
                      <th>ID</th>
                      <th>Team</th>
                      <th>Members</th>
                      <th>Books</th>
                      <th>Created</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="team in filteredTeams" :key="team.id">
                      <td class="text-muted">{{ team.id }}</td>
                      <td>
                        <div class="d-flex align-items-center">
                          <div>
                            <RouterLink 
                              :to="`/admin/teams/${team.id}/edit`" 
                              class="fw-semibold text-decoration-none"
                              :class="{ 'text-muted': !!team.deleted_at }">
                              {{ team.name }}
                            </RouterLink>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div class="d-flex flex-column">
                          <span class="fw-semibold">{{ team.user_count || 0 }} 
                            member{{ (team.user_count || 0) !== 1 ? 's' : '' }}</span>
                          <small class="text-muted" v-if="team.user_count > 0">
                            <span v-if="team.admin_count > 0" class="me-2">
                              <i class="bi bi-shield-check text-danger"></i> {{ team.admin_count }} admin
                            </span>
                            <span v-if="team.collaborator_count > 0" class="me-2">
                              <i class="bi bi-pencil text-warning"></i> {{ team.collaborator_count }} edit
                            </span>
                            <span v-if="team.viewer_count > 0">
                              <i class="bi bi-eye text-info"></i> {{ team.viewer_count }} view
                            </span>
                          </small>
                          <small class="text-muted" v-else>
                            No members yet
                          </small>
                        </div>
                      </td>
                      <td>
                        <div class="d-flex flex-column">
                          <span class="fw-semibold">{{ team.book_count || 0 }} 
                            book{{ (team.book_count || 0) !== 1 ? 's' : '' }}</span>
                        </div>
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
                        <div class="btn-group btn-group-sm admin-actions" role="group">
                          <RouterLink :to="`/admin/teams/${team.id}/edit`" class="btn btn-outline-primary" 
                            title="Edit team">
                            <i class="bi bi-pencil"></i>
                          </RouterLink>
                          <button type="button" class="btn"
                            :class="!team.deleted_at ? 'btn-outline-warning' : 'btn-outline-success'"
                            @click="toggleTeamStatus(team)" 
                            :title="!team.deleted_at ? 'Delete team' : 'Restore team'">
                            <i class="bi" :class="!team.deleted_at ? 'bi-trash' : 'bi-arrow-counterclockwise'"></i>
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
  </AdminLayout>
</template>

<script setup>
/**
 * AdminTeamsView Component
 * 
 * Administrative interface for managing system teams. Provides functionality
 * to view, create, edit, and delete teams with proper access controls.
 * 
 * Features:
 * - Team listing with search and filtering capabilities
 * - Team creation, editing, and deletion
 * - Team member management
 * - Comprehensive team information display
 * 
 * Security:
 * - Super admin access required (enforced by AdminLayout)
 * 
 * @component
 */

import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '../../layouts/AdminLayout.vue'
import { useTeamsStore } from '../../stores/teams'
import { useUsersStore } from '../../stores/users'
import { useConfirm } from '../../composables/useConfirm'
import { useToast } from '../../composables/useToast'

const router = useRouter()
const teamsStore = useTeamsStore()
const usersStore = useUsersStore()
const { confirm } = useConfirm()
const { showToast } = useToast()

// Component state
const searchQuery = ref('')
const filterStatus = ref('')
const sortBy = ref('name')

// Computed properties
const filteredTeams = computed(() => {
  let filtered = teamsStore.teams

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(team =>
      team.name.toLowerCase().includes(query)
    )
  }

  // Status filter
  if (filterStatus.value) {
    filtered = filtered.filter(team => {
      if (filterStatus.value === 'active') return !team.deleted_at
      if (filterStatus.value === 'deleted') return !!team.deleted_at
      return true
    })
  }

  // Sort
  filtered = [...filtered].sort((a, b) => {
    if (sortBy.value === 'name') {
      return a.name.localeCompare(b.name)
    } else if (sortBy.value === 'created_at') {
      return new Date(b.created_at) - new Date(a.created_at)
    } else if (sortBy.value === 'user_count') {
      return (b.user_count || 0) - (a.user_count || 0)
    }
    return 0
  })

  return filtered
})

// Helper functions
function formatDate(dateString) {
  if (!dateString) return 'Unknown'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Team management functions
function showCreateTeamModal() {
  router.push('/admin/teams/create')
}

function editTeam(team) {
  router.push(`/admin/teams/${team.id}/edit`)
}

async function toggleTeamStatus(team) {
  const isActive = !team.deleted_at
  const action = isActive ? 'delete' : 'restore'
  const actionPast = isActive ? 'deleted' : 'restored'
  
  try {
    await confirm({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} Team`,
      message: `Are you sure you want to ${action} team "${team.name}"?`,
      confirmText: action.charAt(0).toUpperCase() + action.slice(1),
      cancelText: 'Cancel',
      confirmButtonVariant: isActive ? 'danger' : 'success'
    })
    
    if (isActive) {
      // Delete team
      await teamsStore.deleteTeam(team.id)
    } else {
      // Restore team
      await teamsStore.updateTeam(team.id, { deleted_at: null })
    }
    
    showToast({
      title: 'Success',
      message: `Team ${actionPast} successfully!`,
      variant: 'success'
    })
    
    // Reload teams
    loadTeams()
  } catch (error) {
    if (error.message === 'User canceled') return
    
    showToast({
      title: 'Error',
      message: `Error ${action}ing team: ${error.message}`,
      variant: 'danger'
    })
  }
}

// Load teams data
async function loadTeams() {
  try {
    // If filter is set to deleted, load only deleted teams (recycle bin)
    if (filterStatus.value === 'deleted') {
      await teamsStore.fetchDeletedTeams();
    } 
    // Otherwise load active teams (default behavior)
    else {
      await teamsStore.fetchAllTeams();
    }
  } catch (error) {
    console.error('Error loading teams:', error)
    showToast({
      title: 'Error',
      message: `Error loading teams: ${error.message}`,
      variant: 'danger',
      duration: 7000 // Longer duration for error messages
    })
  }
}

// Initialize component
onMounted(async () => {
  // Load teams
  await loadTeams()
})

// Watch for filter changes and reload the appropriate teams
watch(filterStatus, async () => {
  await loadTeams()
})
</script>


