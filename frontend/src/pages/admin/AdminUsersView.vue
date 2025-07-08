<template>
  <AdminLayout>
    <div class="container-fluid py-4">
      <div class="row">
        <div class="col-12">
          <!-- Page Header -->
          <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 class="mb-0">User Management</h1>
              <nav aria-label="breadcrumb">
                <ol class="breadcrumb">
                  <li class="breadcrumb-item">
                    <RouterLink to="/admin">Admin</RouterLink>
                  </li>
                  <li class="breadcrumb-item active" aria-current="page">Users</li>
                </ol>
              </nav>
            </div>
            <RouterLink to="/admin/users/create" class="btn btn-primary">
              <i class="bi bi-person-plus me-1"></i>
              Add User
            </RouterLink>
          </div>

          <!-- Search and Filters -->
          <div class="card mb-4 admin-filters">
            <div class="card-body">
              <div class="row">
                <div class="col-md-8">
                  <div class="form-floating position-relative">
                    <input 
                      type="text" 
                      class="form-control" 
                      id="searchUsers" 
                      v-model="searchQuery"
                      @input="handleSearchInput"
                      placeholder="Search users..."
                    >
                    <label for="searchUsers">Search</label>
                    <button 
                      v-if="searchQuery" 
                      type="button" 
                      class="btn btn-sm btn-outline-secondary position-absolute top-50 end-0 translate-middle-y me-2"
                      @click="clearSearch"
                      title="Clear search"
                      style="z-index: 10;"
                    >
                      <i class="bi bi-x"></i>
                    </button>
                  </div>
                </div>
                <div class="col-md-2">
                  <div class="form-floating">
                    <select class="form-select" id="filterRole" v-model="filterRole" @change="handleFilterChange">
                      <option value="">All Roles</option>
                      <option value="superadmin">Super Admin</option>
                      <option value="user">Regular User</option>
                    </select>
                    <label for="filterRole">Filter by Role</label>
                  </div>
                </div>
                <div class="col-md-2">
                  <div class="form-floating">
                    <select class="form-select" id="filterStatus" v-model="filterStatus" @change="handleFilterChange">
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
            <div class="card-header d-flex justify-content-between align-items-center">
              <h5 class="card-title mb-0">
                Users ({{ pagination.total }})
              </h5>
              <div class="d-flex align-items-center">
                <label for="pageSize" class="form-label me-2 mb-0">Show:</label>
                <select 
                  id="pageSize" 
                  class="form-select form-select-sm" 
                  style="width: auto;"
                  v-model="pageSize"
                  @change="handlePageSizeChange"
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </select>
                <span class="text-muted ms-2">per page</span>
              </div>
            </div>
            
            <!-- Pagination at Top -->
            <div v-if="currentUsers.length > 0" class="card-header border-top border-bottom-0 bg-body-secondary d-flex justify-content-between align-items-center">
              <div class="pagination-info">
                <small class="text-muted">
                  Showing {{ ((pagination.page - 1) * pagination.limit) + 1 }} to 
                  {{ Math.min(pagination.page * pagination.limit, pagination.total) }} of 
                  {{ pagination.total }} users
                </small>
              </div>
              
              <nav aria-label="Users pagination">
                <ul class="pagination pagination-sm mb-0">
                  <li class="page-item" :class="{ disabled: !pagination.hasPrev }">
                    <button class="page-link" @click="goToPrevPage" :disabled="!pagination.hasPrev">
                      <i class="bi bi-chevron-left"></i>
                    </button>
                  </li>
                  
                  <!-- Show page numbers -->
                  <li v-for="page in getVisiblePages()" :key="page" 
                      class="page-item" :class="{ active: page === pagination.page }">
                    <button class="page-link" @click="goToPage(page)">
                      {{ page }}
                    </button>
                  </li>
                  
                  <li class="page-item" :class="{ disabled: !pagination.hasNext }">
                    <button class="page-link" @click="goToNextPage" :disabled="!pagination.hasNext">
                      <i class="bi bi-chevron-right"></i>
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
            
            <div class="card-body p-0">
              <div v-if="isLoading" class="admin-loading">
                <div class="spinner-border" role="status">
                  <span class="visually-hidden">Loading users...</span>
                </div>
              </div>

              <div v-else-if="currentUsers.length === 0" class="admin-empty-state">
                <i class="bi bi-people"></i>
                <p class="mb-0">No users found</p>
                <small v-if="searchQuery || filterRole || filterStatus">
                  Try adjusting your search criteria
                </small>
              </div>

              <div v-else class="table-responsive">
                <table class="table table-hover mb-0">
                  <thead class="table">
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Teams</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="user in currentUsers" :key="user.id">
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
                        <span class="badge status-badge" :class="user.superadmin ? 'bg-primary' : 'bg-info'">
                          {{ user.superadmin ? 'Super Admin' : 'User' }}
                        </span>
                      </td>
                      <td>
                        <div class="d-flex flex-column">
                          <span class="fw-semibold">{{ user.team_count || 0 }}
                            team{{ (user.team_count || 0) !== 1 ? 's' : '' }}</span>
                          <small class="text-muted" v-if="user.team_count > 0">
                            <span v-if="user.admin_teams > 0" class="me-2">
                              <i class="bi bi-shield-check text-danger"></i> {{ user.admin_teams }} admin
                            </span>
                            <span v-if="user.collaborator_teams > 0" class="me-2">
                              <i class="bi bi-pencil text-warning"></i> {{ user.collaborator_teams }} edit
                            </span>
                            <span v-if="user.viewer_teams > 0">
                              <i class="bi bi-eye text-info"></i> {{ user.viewer_teams }} view
                            </span>
                          </small>
                          <small class="text-muted" v-else>
                            No team access
                          </small>
                        </div>
                      </td>
                      <td>
                        <span class="badge status-badge btn" 
                          :class="user.active ? 'bg-info' : 'bg-secondary'"
                          @click="toggleUserStatus(user)" 
                          :title="user.active ? 'Click to disable user' : 'Click to enable user'"
                          :disabled="user.id === usersStore.currentUser?.id">
                          {{ user.active ? 'Active' : 'Inactive' }}
                        </span>
                      </td>
                      <td>
                        <small>{{ formatDate(user.created_at) }}</small>
                      </td>
                      <td>
                        <div class="admin-actions">
                          <button type="button" class="btn btn-link me-2" @click="editUser(user)"
                            title="Edit user">
                            <i class="bi bi-pencil"></i>
                          </button>
                          <button type="button" class="btn btn-link" @click="deleteUser(user)"
                            title="Delete user" :disabled="user.id === usersStore.currentUser?.id">
                            <i class="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Pagination -->
              <div v-if="currentUsers.length > 0" class="card-footer d-flex justify-content-between align-items-center">
                <div class="pagination-info">
                  <small class="text-muted">
                    Showing {{ ((pagination.page - 1) * pagination.limit) + 1 }} to 
                    {{ Math.min(pagination.page * pagination.limit, pagination.total) }} of 
                    {{ pagination.total }} users
                  </small>
                </div>
                
                <nav aria-label="Users pagination">
                  <ul class="pagination pagination-sm mb-0">
                    <li class="page-item" :class="{ disabled: !pagination.hasPrev }">
                      <button class="page-link" @click="goToPrevPage" :disabled="!pagination.hasPrev">
                        <i class="bi bi-chevron-left"></i>
                      </button>
                    </li>
                    
                    <!-- Show page numbers -->
                    <li v-for="page in getVisiblePages()" :key="page" 
                        class="page-item" :class="{ active: page === pagination.page }">
                      <button class="page-link" @click="goToPage(page)">
                        {{ page }}
                      </button>
                    </li>
                    
                    <li class="page-item" :class="{ disabled: !pagination.hasNext }">
                      <button class="page-link" @click="goToNextPage" :disabled="!pagination.hasNext">
                        <i class="bi bi-chevron-right"></i>
                      </button>
                    </li>
                  </ul>
                </nav>
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

import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '../../layouts/AdminLayout.vue'
import { useUsersStore } from '../../stores/users'
import { useConfirm } from '../../composables/useConfirm'
import { useToast } from '../../composables/useToast'

const usersStore = useUsersStore()
const router = useRouter()
const { confirm } = useConfirm()
const { showToast } = useToast()

// Component state
const searchQuery = ref('')
const filterRole = ref('')
const filterStatus = ref('')
const searchTimeout = ref(null)
const pageSize = ref(10) // Default page size matching store default

// Computed properties
const currentUsers = computed(() => usersStore.users)
const pagination = computed(() => usersStore.usersPagination)
const isLoading = computed(() => usersStore.isLoadingUsers)

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

// Search and filter functions
function handleSearchInput() {
  // Clear previous timeout
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }
  
  // Debounce search
  searchTimeout.value = setTimeout(() => {
    loadUsers({ page: 1 }) // Reset to first page when searching
  }, 300)
}

function clearSearch() {
  searchQuery.value = ''
  loadUsers({ page: 1 }) // Reset to first page when clearing search
}

function handleFilterChange() {
  loadUsers({ page: 1 }) // Reset to first page when filtering
}

function handlePageSizeChange() {
  loadUsers({ page: 1, limit: parseInt(pageSize.value) })
}

// Pagination functions
function goToPage(page) {
  loadUsers({ page })
}

function goToNextPage() {
  if (pagination.value.hasNext) {
    goToPage(pagination.value.page + 1)
  }
}

function goToPrevPage() {
  if (pagination.value.hasPrev) {
    goToPage(pagination.value.page - 1)
  }
}

// Generate visible page numbers for pagination
function getVisiblePages() {
  const current = pagination.value.page
  const total = pagination.value.totalPages
  const pages = []
  
  if (total <= 7) {
    // Show all pages if total is 7 or less
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    // Show smart pagination
    if (current <= 4) {
      // Show first 5 pages + ... + last page
      for (let i = 1; i <= 5; i++) {
        pages.push(i)
      }
      if (total > 6) {
        pages.push('...')
        pages.push(total)
      }
    } else if (current >= total - 3) {
      // Show first page + ... + last 5 pages
      pages.push(1)
      if (current > 5) {
        pages.push('...')
      }
      for (let i = total - 4; i <= total; i++) {
        pages.push(i)
      }
    } else {
      // Show first page + ... + current-1, current, current+1 + ... + last page
      pages.push(1)
      pages.push('...')
      for (let i = current - 1; i <= current + 1; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(total)
    }
  }
  
  return pages
}

// User management functions
function editUser(user) {
  router.push(`/admin/users/${user.id}/edit`)
}

async function toggleUserStatus(user) {
  if (user.id === usersStore.currentUser?.id) {
    showToast({
      title: 'Action Not Allowed',
      message: 'You cannot disable your own account!',
      variant: 'warning'
    })
    return
  }

  const action = user.active ? 'disable' : 'enable'
  const actionPast = user.active ? 'disabled' : 'enabled'

  try {
    await confirm({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} User`,
      message: `Are you sure you want to ${action} user "${user.username}"?`,
      confirmText: action.charAt(0).toUpperCase() + action.slice(1),
      cancelText: 'Cancel',
      confirmButtonVariant: 'primary'
    })

    if (user.active) {
      await usersStore.disableUser(user.id)
    } else {
      await usersStore.enableUser(user.id)
    }

    showToast({
      title: 'Success',
      message: `User ${actionPast} successfully!`,
      variant: 'success'
    })
  } catch (error) {
    if (error.message === 'User canceled') return

    showToast({
      title: 'Error',
      message: `Error ${action}ing user: ${error.message}`,
      variant: 'danger'
    })
  }
}

async function deleteUser(user) {
  if (user.id === usersStore.currentUser?.id) {
    showToast({
      title: 'Action Not Allowed',
      message: 'You cannot delete your own account!',
      variant: 'warning'
    })
    return
  }

  try {
    await confirm({
      title: 'Delete User',
      message: `Are you sure you want to delete user "${user.username}"?<br><br>` +
        `This action cannot be undone and will permanently remove:<br>` +
        `• The user account<br>` +
        `• All associated data<br>` +
        `• Access to all books`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmButtonVariant: 'danger'
    })

    await usersStore.deleteUser(user.id)

    showToast({
      title: 'Success',
      message: 'User deleted successfully!',
      variant: 'success'
    })
  } catch (error) {
    if (error.message === 'User canceled') {
      // User canceled the confirmation dialog, do nothing
      return
    }

    showToast({
      title: 'Error',
      message: `Error deleting user: ${error.message}`,
      variant: 'danger'
    })
  }
}

// Load users data with pagination
async function loadUsers(options = {}) {
  try {
    await usersStore.fetchAllUsers({
      page: options.page || pagination.value.page,
      limit: options.limit || parseInt(pageSize.value),
      search: searchQuery.value.trim() || undefined,
      role: filterRole.value || undefined,
      status: filterStatus.value || undefined
    })
  } catch (error) {
    console.error('Error loading users:', error)
    showToast({
      title: 'Error',
      message: `Error loading users: ${error.message}`,
      variant: 'danger',
      duration: 7000 // Longer duration for error messages
    })
  }
}

onMounted(() => {
  // Initialize page size from store
  pageSize.value = pagination.value.limit
  loadUsers()
})
</script>
