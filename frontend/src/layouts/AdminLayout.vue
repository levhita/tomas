<template>
  <!-- 
    Main layout wrapper for admin-specific pages
    Uses flexbox to ensure navbar stays at top and content fills remaining space
  -->
  <div class="admin admin-layout">
    <!-- 
      Admin-specific navigation bar
      Displays admin branding and admin-specific navigation options
    -->
    <AdminNavbar />

    <!-- 
      Main content area where admin page components are rendered
      Uses slot to allow any content to be inserted by parent components
    -->
    <div class="admin-content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
/**
 * AdminLayout Component
 * 
 * A layout component specifically designed for administrative pages.
 * Provides a consistent structure with admin-specific navigation and
 * dynamic page title management for admin sections.
 * 
 * Features:
 * - Displays AdminNavbar with admin branding and navigation
 * - Automatically updates page title to show admin context
 * - Provides flexible content area through slot system
 * - Maintains full viewport height layout with sticky navigation
 * - Integrates with users store for admin authentication
 * - Restricts access to super admin users only
 * 
 * Page Title Management:
 * - Format: "Administration - Tomás"
 * - Updates immediately to reflect admin context
 * - Useful for browser tab identification when working in admin mode
 * 
 * Layout Structure:
 * - Fixed admin navbar at top
 * - Flexible content area that grows to fill remaining space
 * - Full viewport height (100vh) layout
 * - Responsive design compatible
 * 
 * Security:
 * - Automatically redirects non-admin users to workspaces
 * - Integrates with authentication system
 * - Provides clear admin context indicators
 * 
 * Usage:
 * <AdminLayout>
 *   <YourAdminPageContent />
 * </AdminLayout>
 * 
 * Dependencies:
 * - Vue 3 Composition API (computed, watch, onMounted)
 * - AdminNavbar component
 * - Vue Router (for navigation and redirects)
 * - Users store (for admin authentication)
 * 
 * @component
 * @example
 * <template>
 *   <AdminLayout>
 *     <div class="container">
 *       <h1>User Management</h1>
 *       <!-- Admin content here -->
 *     </div>
 *   </AdminLayout>
 * </template>
 */

import { computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AdminNavbar from '../components/AdminNavbar.vue'
import { useUsersStore } from '../stores/users'

const router = useRouter()
const usersStore = useUsersStore()

// Computed property for admin access control
const isAuthorizedAdmin = computed(() => {
  return usersStore.currentUser && usersStore.isSuperAdmin
})

// Page title management
const pageTitle = computed(() => {
  return 'Administration - Tomás'
})

// Watch for page title changes and update document title
watch(pageTitle, (newTitle) => {
  document.title = newTitle
}, { immediate: true })

// Check admin authorization on mount
onMounted(() => {
  // If user is not authenticated or not a super admin, redirect to workspaces
  if (!isAuthorizedAdmin.value) {
    router.replace({
      name: 'workspaces',
      query: { error: 'unauthorized-admin' }
    })
  }
})

// Watch for changes in admin status and redirect if needed
watch(isAuthorizedAdmin, (isAuthorized) => {
  if (!isAuthorized) {
    router.replace({
      name: 'workspaces',
      query: { error: 'unauthorized-admin' }
    })
  }
})
</script>
