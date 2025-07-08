<template>
  <AdminLayout>
    <div class="container-fluid py-4">
      <div class="row">
        <div class="col-12">
          <!-- Quick Stats Row -->
          <div class="row mb-4 admin-dashboard-stats">
            <div class="col-md-3">
              <RouterLink to="/admin/users" class="text-decoration-none">
                <div class="card bg-primary text-white">
                  <div class="card-body">
                    <div class="d-flex justify-content-between">
                      <div>
                        <h6 class="card-title">Total Users</h6>
                        <h3 class="mb-0">{{ adminStore.dashboardStats?.users?.total || 0 }}</h3>
                        <small class="opacity-75">
                          {{ adminStore.dashboardStats?.users?.active || 0 }} active
                          <span v-if="adminStore.dashboardStats?.users?.superadmins" class="ms-1">
                            • {{ adminStore.dashboardStats.users.superadmins }} admin{{ adminStore.dashboardStats.users.superadmins === 1 ? '' : 's' }}
                          </span>
                        </small>
                      </div>
                      <div class="align-self-center">
                        <i class="bi bi-people fs-1 opacity-75"></i>
                      </div>
                    </div>
                  </div>
                </div>
              </RouterLink>
            </div>
            <div class="col-md-3">
              <RouterLink to="/admin/teams" class="text-decoration-none">
                <div class="card bg-success text-white">
                  <div class="card-body">
                    <div class="d-flex justify-content-between">
                      <div>
                        <h6 class="card-title">Total Teams</h6>
                        <h3 class="mb-0">{{ adminStore.dashboardStats?.teams?.total || 0 }}</h3>
                        <small class="opacity-75">
                          {{ adminStore.dashboardStats?.teams?.active || 0 }} active
                        </small>
                      </div>
                      <div class="align-self-center">
                        <i class="bi bi-people-fill fs-1 opacity-75"></i>
                      </div>
                    </div>
                  </div>
                </div>
              </RouterLink>
            </div>
            <div class="col-md-3">
              <div class="card bg-info text-white">
                <div class="card-body">
                  <div class="d-flex justify-content-between">
                    <div>
                      <h6 class="card-title">Total Books</h6>
                      <h3 class="mb-0">{{ adminStore.dashboardStats?.books?.total || 0 }}</h3>
                      <small class="opacity-75">Across all teams</small>
                    </div>
                    <div class="align-self-center">
                      <i class="bi bi-book fs-1 opacity-75"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-md-3">
              <div class="card" :class="healthCardClass">
                <div class="card-body">
                  <div class="d-flex justify-content-between">
                    <div>
                      <h6 class="card-title">System Health</h6>
                      <h3 class="mb-0">{{ adminStore.healthStatus.toUpperCase() }}</h3>
                      <small v-if="adminStore.healthData.uptime" class="opacity-75">
                        Uptime: {{ formatUptime(adminStore.healthData.uptime) }}
                      </small>
                    </div>
                    <div class="align-self-center">
                      <i :class="healthIconClass" class="fs-1 opacity-75"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Detailed Stats Row -->
          <div class="row mb-4" v-if="adminStore.dashboardStats">
            <div class="col-md-12">
              <div class="card">
                <div class="card-body">
                  <h5 class="card-title">
                    <i class="bi bi-bar-chart me-2"></i>
                    System Statistics
                  </h5>
                  <div class="row">
                    <!-- User Statistics -->
                    <div class="col-md-6">
                      <h6 class="text-muted mb-3">User Distribution</h6>
                      <div class="mb-3">
                        <div class="d-flex justify-content-between mb-1">
                          <span>Active Users</span>
                          <span class="text-success">{{ adminStore.dashboardStats.users?.active || 0 }}</span>
                        </div>
                        <div class="progress mb-2" style="height: 8px;">
                          <div class="progress-bar bg-success" role="progressbar"
                            :style="{ width: ((adminStore.dashboardStats.users?.active || 0) / (adminStore.dashboardStats.users?.total || 1) * 100) + '%' }">
                          </div>
                        </div>
                      </div>
                      <div class="mb-3">
                        <div class="d-flex justify-content-between mb-1">
                          <span>Inactive Users</span>
                          <span class="text-muted">{{ (adminStore.dashboardStats.users?.total || 0) - (adminStore.dashboardStats.users?.active || 0) }}</span>
                        </div>
                        <div class="progress mb-2" style="height: 8px;">
                          <div class="progress-bar bg-secondary" role="progressbar"
                            :style="{ width: (((adminStore.dashboardStats.users?.total || 0) - (adminStore.dashboardStats.users?.active || 0)) / (adminStore.dashboardStats.users?.total || 1) * 100) + '%' }">
                          </div>
                        </div>
                      </div>
                      <div class="mb-3">
                        <div class="d-flex justify-content-between mb-1">
                          <span>Super Admins</span>
                          <span class="text-danger">{{ adminStore.dashboardStats.users?.superadmins || 0 }}</span>
                        </div>
                        <div class="progress mb-2" style="height: 8px;">
                          <div class="progress-bar bg-danger" role="progressbar"
                            :style="{ width: ((adminStore.dashboardStats.users?.superadmins || 0) / (adminStore.dashboardStats.users?.total || 1) * 100) + '%' }">
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Team Statistics -->
                    <div class="col-md-6">
                      <h6 class="text-muted mb-3">Team Status</h6>
                      <div class="mb-3">
                        <div class="d-flex justify-content-between mb-1">
                          <span>Active Teams</span>
                          <span class="text-success">{{ adminStore.dashboardStats.teams?.active || 0 }}</span>
                        </div>
                        <div class="progress mb-2" style="height: 8px;">
                          <div class="progress-bar bg-success" role="progressbar"
                            :style="{ width: ((adminStore.dashboardStats.teams?.active || 0) / (adminStore.dashboardStats.teams?.total || 1) * 100) + '%' }">
                          </div>
                        </div>
                      </div>
                      <div class="mb-3">
                        <div class="d-flex justify-content-between mb-1">
                          <span>Deleted Teams</span>
                          <span class="text-muted">{{ (adminStore.dashboardStats.teams?.total || 0) - (adminStore.dashboardStats.teams?.active || 0) }}</span>
                        </div>
                        <div class="progress mb-2" style="height: 8px;">
                          <div class="progress-bar bg-secondary" role="progressbar"
                            :style="{ width: (((adminStore.dashboardStats.teams?.total || 0) - (adminStore.dashboardStats.teams?.active || 0)) / (adminStore.dashboardStats.teams?.total || 1) * 100) + '%' }">
                          </div>
                        </div>
                      </div>
                      <div class="mb-3">
                        <div class="d-flex justify-content-between mb-1">
                          <span>Avg Books per Team</span>
                          <span class="text-info">
                            {{ adminStore.dashboardStats.teams?.active > 0 ? 
                              Math.round((adminStore.dashboardStats.books?.total || 0) / adminStore.dashboardStats.teams.active * 10) / 10 : 0 }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- System Health Details Row -->
          <div class="row mb-4">
            <div class="col-md-12">
              <div class="card">
                <div class="card-body">
                  <h5 class="card-title">
                    <i class="bi bi-activity me-2"></i>
                    System Health Details
                  </h5>
                  <div v-if="adminStore.healthStatus === 'loading'" class="text-center py-3">
                    <div class="spinner-border text-primary" role="status">
                      <span class="visually-hidden">Loading...</span>
                    </div>
                  </div>
                  <div v-else-if="adminStore.healthError" class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    Failed to load health information: {{ adminStore.healthError }}
                  </div>
                  <div v-else class="row">
                    <div class="col-md-3">
                      <h6 class="text-muted">Memory Usage</h6>
                      <div v-if="adminStore.healthData.memory">
                        <strong>{{ adminStore.healthData.memory.used }}MB</strong> / {{ adminStore.healthData.memory.total }}MB
                        <div class="progress mt-1" style="height: 8px;">
                          <div class="progress-bar" role="progressbar"
                            :style="{ width: (adminStore.healthData.memory.used / adminStore.healthData.memory.total * 100) + '%' }"
                            :class="getMemoryBarClass(adminStore.healthData.memory.used / adminStore.healthData.memory.total)"
                            :aria-label="`Memory usage: ${adminStore.healthData.memory.used}MB of ${adminStore.healthData.memory.total}MB`">
                          </div>
                        </div>
                      </div>
                      <span v-else class="text-muted">N/A</span>
                    </div>
                    <div class="col-md-3">
                      <h6 class="text-muted">Database</h6>
                      <div v-if="adminStore.healthData.database">
                        <div><strong>Status:</strong> {{ adminStore.healthData.database.status }}</div>
                        <div><strong>Response:</strong> {{ adminStore.healthData.database.response_time }}</div>
                        <div><strong>Tables:</strong> {{ adminStore.healthData.database.tables }}</div>
                      </div>
                      <span v-else class="text-muted">N/A</span>
                    </div>
                    <div class="col-md-3">
                      <h6 class="text-muted">Environment</h6>
                      <div v-if="adminStore.healthData.environment">
                        <div><strong>Node:</strong> {{ adminStore.healthData.environment.node_version }}</div>
                        <div><strong>Platform:</strong> {{ adminStore.healthData.environment.platform }}</div>
                        <div><strong>Arch:</strong> {{ adminStore.healthData.environment.arch }}</div>
                      </div>
                      <span v-else class="text-muted">N/A</span>
                    </div>
                    <div class="col-md-3">
                      <h6 class="text-muted">Last Check</h6>
                      <div v-if="adminStore.healthData.timestamp">
                        {{ new Date(adminStore.healthData.timestamp).toLocaleString() }}
                      </div>
                      <span v-else class="text-muted">N/A</span>
                      <div class="mt-2">
                        <button @click="loadHealthStatus" class="btn btn-sm btn-outline-primary">
                          <i class="bi bi-arrow-clockwise me-1"></i>
                          Refresh
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
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
 * AdminView Component
 * 
 * The main dashboard page for system administrators. Provides an overview
 * of system statistics, quick access to admin functions, and status monitoring.
 * 
 * Features:
 * - System statistics dashboard with user and book counts
 * - Quick navigation to admin functions
 * - System health status indicators
 * - Admin role verification and access control
 * 
 * Security:
 * - Automatically restricts access to super admin users only
 * - Integrates with AdminLayout for consistent admin experience
 * 
 * @component
 */

import { ref, onMounted, computed } from 'vue'
import AdminLayout from '../../layouts/AdminLayout.vue'
import { useUsersStore } from '../../stores/users'
import { useAdminStore } from '../../stores/admin'
import { useTeamsStore } from '../../stores/teams'

const usersStore = useUsersStore()
const adminStore = useAdminStore()
const teamsStore = useTeamsStore()

// Computed properties for health indicator styling
const healthCardClass = computed(() => {
  switch (adminStore.healthStatus) {
    case 'healthy':
      return 'bg-success text-white'
    case 'unhealthy':
      return 'bg-danger text-white'
    case 'loading':
      return 'bg-warning text-white'
    default:
      return 'bg-secondary text-white'
  }
})

const healthIconClass = computed(() => {
  switch (adminStore.healthStatus) {
    case 'healthy':
      return 'bi bi-check-circle'
    case 'unhealthy':
      return 'bi bi-exclamation-triangle'
    case 'loading':
      return 'bi bi-clock'
    default:
      return 'bi bi-question-circle'
  }
})

// Load dashboard statistics
async function loadDashboardStats() {
  try {
    // Load dashboard stats from the admin store
    await adminStore.fetchDashboardStats()
  } catch (error) {
    console.error('Error loading dashboard stats:', error)
  }
}

// Load system health information
async function loadHealthStatus() {
  try {
    // Load health status from the admin store
    await adminStore.fetchHealthStatus()
  } catch (error) {
    console.error('Error loading health status:', error)
  }
}

// Format uptime in a human-readable way
function formatUptime(seconds) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else if (minutes > 0) {
    return `${minutes}m`
  } else {
    return `${Math.floor(seconds)}s`
  }
}

// Get appropriate progress bar class based on memory usage percentage
function getMemoryBarClass(percentage) {
  if (percentage > 0.9) {
    return 'bg-danger'
  } else if (percentage > 0.7) {
    return 'bg-warning'
  } else {
    return 'bg-success'
  }
}

onMounted(() => {
  loadDashboardStats()
  loadHealthStatus()
})
</script>