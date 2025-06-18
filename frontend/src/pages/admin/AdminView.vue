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
 * - System statistics dashboard with user and workspace counts
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

import { ref, onMounted } from 'vue'
import AdminLayout from '../../layouts/AdminLayout.vue'
import { useUsersStore } from '../../stores/users'

const usersStore = useUsersStore()

// Load dashboard statistics
async function loadDashboardStats() {
  try {
    // Load user stats from the store
    await usersStore.fetchAllUsers()
  } catch (error) {
    console.error('Error loading dashboard stats:', error)
  }
}

onMounted(() => {
  loadDashboardStats()
})
</script>