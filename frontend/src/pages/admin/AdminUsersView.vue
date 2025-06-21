<template>
  <AdminLayout>
    <div class="container-fluid py-4">
      <div class="row">
        <div class="col-12">
          <!-- Page Header -->
          <div class="d-flex justify-content-between align-items-center mb-4">
            <button class="btn btn-primary" @click="showCreateUserModal">
              <i class="bi bi-person-plus me-1"></i>
              Add User
            </button>
          </div>

          <!-- Search and Filters -->
          <div class="card mb-4 admin-filters">
            <div class="card-body">
              <div class="row">
                <div class="col-md-6">
                  <div class="form-floating">
                    <input type="text" class="form-control" id="searchUsers" v-model="searchQuery"
                      placeholder="Search users...">
                    <label for="searchUsers">Search users by username</label>
                  </div>
                </div>
                <div class="col-md-3">
                  <div class="form-floating">
                    <select class="form-select" id="filterRole" v-model="filterRole">
                      <option value="">All Roles</option>
                      <option value="superadmin">Super Admin</option>
                      <option value="user">Regular User</option>
                    </select>
                    <label for="filterRole">Filter by Role</label>
                  </div>
                </div>
                <div class="col-md-3">
                  <div class="form-floating">
                    <select class="form-select" id="filterStatus" v-model="filterStatus">
                      <option value="">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                    <label for="filterStatus">Filter by Status</label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Users Table -->
          <div class="card admin-table">
            <div class="card-header">
              <h5 class="card-title mb-0">
                Users ({{ filteredUsers.length }})
              </h5>
            </div>
            <div class="card-body p-0">
              <div v-if="usersStore.isLoadingUsers" class="admin-loading">
                <div class="spinner-border" role="status">
                  <span class="visually-hidden">Loading users...</span>
                </div>
              </div>

              <div v-else-if="filteredUsers.length === 0" class="admin-empty-state">
                <i class="bi bi-people"></i>
                <p class="mb-0">No users found</p>
                <small v-if="searchQuery || filterRole || filterStatus">
                  Try adjusting your search criteria
                </small>
              </div>

              <div v-else class="table-responsive">
                <table class="table table-hover mb-0">
                  <thead class="table-light">
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Workspaces</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="user in filteredUsers" :key="user.id">
                      <td>
                        <div class="d-flex align-items-center">
                          <div class="bg-primary user-avatar me-2">
                            <span class="text-white">
                              {{ getUserInitials(user.username) }}
                            </span>
                          </div>
                          <div>
                            <div class="fw-semibold">{{ user.username }}</div>
                            <small class="text-muted">ID: {{ user.id }}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span class="badge status-badge" :class="user.superadmin ? 'bg-danger' : 'bg-secondary'">
                          {{ user.superadmin ? 'Super Admin' : 'User' }}
                        </span>
                      </td>
                      <td>
                        <div class="d-flex flex-column">
                          <span class="fw-semibold">{{ user.workspace_count || 0 }}
                            workspace{{ (user.workspace_count || 0) !== 1 ? 's' : '' }}</span>
                          <small class="text-muted" v-if="user.workspace_count > 0">
                            <span v-if="user.admin_workspaces > 0" class="me-2">
                              <i class="bi bi-shield-check text-danger"></i> {{ user.admin_workspaces }} admin
                            </span>
                            <span v-if="user.collaborator_workspaces > 0" class="me-2">
                              <i class="bi bi-pencil text-warning"></i> {{ user.collaborator_workspaces }} edit
                            </span>
                            <span v-if="user.viewer_workspaces > 0">
                              <i class="bi bi-eye text-info"></i> {{ user.viewer_workspaces }} view
                            </span>
                          </small>
                          <small class="text-muted" v-else>
                            No workspace access
                          </small>
                        </div>
                      </td>
                      <td>
                        <span class="badge status-badge" :class="user.active ? 'bg-success' : 'bg-danger'">
                          {{ user.active ? 'Active' : 'Inactive' }}
                        </span>
                      </td>
                      <td>
                        <small>{{ formatDate(user.created_at) }}</small>
                      </td>
                      <td>
                        <div class="btn-group btn-group-sm admin-actions" role="group">
                          <button type="button" class="btn btn-outline-primary" @click="editUser(user)"
                            title="Edit user">
                            <i class="bi bi-pencil"></i>
                          </button>
                          <button type="button" class="btn"
                            :class="user.active ? 'btn-outline-warning' : 'btn-outline-success'"
                            @click="toggleUserStatus(user)" :title="user.active ? 'Disable user' : 'Enable user'"
                            :disabled="user.id === usersStore.currentUser?.id">
                            <i class="bi" :class="user.active ? 'bi-pause-circle' : 'bi-play-circle'"></i>
                          </button>
                          <button type="button" class="btn btn-outline-danger" @click="deleteUser(user)"
                            title="Delete user" :disabled="user.id === usersStore.currentUser?.id">
                            <i class="bi bi-trash"></i>
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

    <!-- User Modal -->
    <UserModal v-model="showUserModal" :user="selectedUser" @save="handleUserSaved" />
  </AdminLayout>
</template>

<script setup>
/**
 * AdminUsersView Component
 * 
 * Administrative interface for managing system users. Provides functionality
 * to view, create, edit, and delete user accounts with proper access controls.
 * 
 * Features:
 * - User listing with search and filtering capabilities
 * - User creation, editing, and deletion
 * - Role management (super admin vs regular user)
 * - User status management (active/inactive)
 * - Comprehensive user information display
 * 
 * Security:
 * - Super admin access required (enforced by AdminLayout)
 * - Prevents self-deletion of current admin user
 * - Proper role-based access controls
 * 
 * @component
 */

import { ref, computed, onMounted } from 'vue'
import AdminLayout from '../../layouts/AdminLayout.vue'
import UserModal from '../../components/modals/UserModal.vue'
import { useUsersStore } from '../../stores/users'

const usersStore = useUsersStore()

// Component state
const searchQuery = ref('')
const filterRole = ref('')
const filterStatus = ref('')
const showUserModal = ref(false)
const selectedUser = ref(null)

// Computed properties
const filteredUsers = computed(() => {
  let filtered = usersStore.users

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(user =>
      user.username.toLowerCase().includes(query)
    )
  }

  // Role filter
  if (filterRole.value) {
    filtered = filtered.filter(user => {
      if (filterRole.value === 'superadmin') return user.superadmin
      if (filterRole.value === 'user') return !user.superadmin
      return true
    })
  }

  // Status filter
  if (filterStatus.value) {
    filtered = filtered.filter(user => {
      if (filterStatus.value === 'active') return user.active
      if (filterStatus.value === 'inactive') return !user.active
      return true
    })
  }

  return filtered
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

// User management functions
function showCreateUserModal() {
  selectedUser.value = null
  showUserModal.value = true
}

function editUser(user) {
  selectedUser.value = user
  showUserModal.value = true
}

function handleUserSaved() {
  // Refresh the users list to show updated data
  // The store will already be updated, but this ensures we have the latest data
  loadUsers()
}

async function toggleUserStatus(user) {
  if (user.id === usersStore.currentUser?.id) {
    alert('You cannot disable your own account!')
    return
  }

  const action = user.active ? 'disable' : 'enable'
  const actionPast = user.active ? 'disabled' : 'enabled'

  const isConfirmed = confirm(
    `Are you sure you want to ${action} user "${user.username}"?`
  )

  if (!isConfirmed) {
    return
  }

  try {
    if (user.active) {
      await usersStore.disableUser(user.id)
    } else {
      await usersStore.enableUser(user.id)
    }
    alert(`User ${actionPast} successfully!`)
  } catch (error) {
    alert(`Error ${action}ing user: ` + error.message)
  }
}

async function deleteUser(user) {
  if (user.id === usersStore.currentUser?.id) {
    alert('You cannot delete your own account!')
    return
  }

  const isConfirmed = confirm(
    `Are you sure you want to delete user "${user.username}"?\n\n` +
    `This action cannot be undone and will permanently remove:\n` +
    `• The user account\n` +
    `• All associated data\n` +
    `• Access to all workspaces\n\n` +
    `Type the username "${user.username}" to confirm deletion.`
  )

  if (!isConfirmed) {
    return
  }

  // Additional confirmation by asking for username
  const confirmUsername = prompt(
    `To confirm deletion, please type the username "${user.username}" exactly:`
  )

  if (confirmUsername !== user.username) {
    alert('Username confirmation failed. Deletion cancelled.')
    return
  }

  try {
    await usersStore.deleteUser(user.id)
    alert('User deleted successfully!')
  } catch (error) {
    alert('Error deleting user: ' + error.message)
  }
}

// Load users data
async function loadUsers() {
  try {
    await usersStore.fetchAllUsers()
  } catch (error) {
    console.error('Error loading users:', error)
    alert('Error loading users: ' + error.message)
  }
}

onMounted(() => {
  loadUsers()
})
</script>
