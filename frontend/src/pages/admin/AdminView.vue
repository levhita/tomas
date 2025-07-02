<template>
  <AdminLayout>
    <div class="container-fluid py-4">
      <div class="row">
        <div class="col-12">
          <!-- Quick Stats Row -->
          <div class="row mb-4 admin-dashboard-stats">
            <div class="col-md-4">
              <RouterLink to="/admin/users" class="text-decoration-none">
                <div class="card bg-primary text-white">
                  <div class="card-body">
                    <div class="d-flex justify-content-between">
                      <div>
                        <h6 class="card-title">Total Users</h6>
                        <h3 class="mb-0">{{ usersStore.userStats.total || 0 }}</h3>
                      </div>
                      <div class="align-self-center">
                        <i class="bi bi-people fs-1 opacity-75"></i>
                      </div>
                    </div>
                  </div>
                </div>
              </RouterLink>
            </div>
            <div class="col-md-4">
              <div class="card" :class="healthCardClass">
                <div class="card-body">
                  <div class="d-flex justify-content-between">
                    <div>
                      <h6 class="card-title">System Health</h6>
                      <h3 class="mb-0">{{ healthStatus.toUpperCase() }}</h3>
                      <small v-if="healthData.uptime" class="opacity-75">
                        Uptime: {{ formatUptime(healthData.uptime) }}
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

          <!-- Admin Functions Row -->
          <div class="row mb-4">
            <div class="col-md-12">
              <div class="card">
                <div class="card-body">
                  <h5 class="card-title">
                    <i class="bi bi-activity me-2"></i>
                    System Health Details
                  </h5>
                  <div v-if="healthStatus === 'loading'" class="text-center py-3">
                    <div class="spinner-border text-primary" role="status">
                      <span class="visually-hidden">Loading...</span>
                    </div>
                  </div>
                  <div v-else-if="healthError" class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    Failed to load health information: {{ healthError }}
                  </div>
                  <div v-else class="row">
                    <div class="col-md-3">
                      <h6 class="text-muted">Memory Usage</h6>
                      <div v-if="healthData.memory">
                        <strong>{{ healthData.memory.used }}MB</strong> / {{ healthData.memory.total }}MB
                        <div class="progress mt-1" style="height: 8px;">
                          <div class="progress-bar" role="progressbar"
                            :style="{ width: (healthData.memory.used / healthData.memory.total * 100) + '%' }"
                            :class="getMemoryBarClass(healthData.memory.used / healthData.memory.total)"
                            :aria-label="`Memory usage: ${healthData.memory.used}MB of ${healthData.memory.total}MB`">
                          </div>
                        </div>
                      </div>
                      <span v-else class="text-muted">N/A</span>
                    </div>
                    <div class="col-md-3">
                      <h6 class="text-muted">Database</h6>
                      <div v-if="healthData.database">
                        <div><strong>Status:</strong> {{ healthData.database.status }}</div>
                        <div><strong>Response:</strong> {{ healthData.database.response_time }}</div>
                        <div><strong>Tables:</strong> {{ healthData.database.tables }}</div>
                      </div>
                      <span v-else class="text-muted">N/A</span>
                    </div>
                    <div class="col-md-3">
                      <h6 class="text-muted">Environment</h6>
                      <div v-if="healthData.environment">
                        <div><strong>Node:</strong> {{ healthData.environment.node_version }}</div>
                        <div><strong>Platform:</strong> {{ healthData.environment.platform }}</div>
                        <div><strong>Arch:</strong> {{ healthData.environment.arch }}</div>
                      </div>
                      <span v-else class="text-muted">N/A</span>
                    </div>
                    <div class="col-md-3">
                      <h6 class="text-muted">Last Check</h6>
                      <div v-if="healthData.timestamp">
                        {{ new Date(healthData.timestamp).toLocaleString() }}
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

          <!-- Admin Functions Row -->
          <div class="row">
            <div class="col-md-12">
              <div class="card">
                <div class="card-body">
                  <h5 class="card-title">
                    <i class="bi bi-people me-2"></i>
                    User Management
                  </h5>
                  <p class="card-text">Manage users, permissions, and access rights. Create, edit, or deactivate user
                    accounts.</p>
                  <RouterLink to="/admin/users" class="btn btn-primary">
                    <i class="bi bi-arrow-right me-1"></i>
                    Manage Users
                  </RouterLink>
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
import fetchWithAuth from '../../utils/fetch'

const usersStore = useUsersStore()

// Health check state
const healthStatus = ref('loading')
const healthData = ref({})
const healthError = ref(null)

// Computed properties for health indicator styling
const healthCardClass = computed(() => {
  switch (healthStatus.value) {
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
  switch (healthStatus.value) {
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
    // Load user stats from the store
    await usersStore.fetchAllUsers()
  } catch (error) {
    console.error('Error loading dashboard stats:', error)
  }
}

// Load system health information
async function loadHealthStatus() {
  try {
    healthStatus.value = 'loading'
    healthError.value = null

    const response = await fetchWithAuth('/api/health/admin')

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`)
    }

    const data = await response.json()
    healthData.value = data
    healthStatus.value = data.status || 'unknown'
  } catch (error) {
    console.error('Error loading health status:', error)
    healthStatus.value = 'unhealthy'
    healthError.value = error.message
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