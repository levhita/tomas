<template>
  <!-- User dropdown menu for navbar navigation -->
  <li class="nav-item dropdown">
    <!-- Dropdown trigger button showing user avatar and username -->
    <a class="nav-link dropdown-toggle" href="#" id="userDropdown" role="button" data-bs-toggle="dropdown"
      aria-expanded="false">
      <i class="bi bi-person-circle me-1"></i>
      {{ usersStore.currentUser?.username || 'User' }}
      <i :class="['bi', getRoleIcon, 'ms-1', getRoleBadgeClass]"></i>
    </a>

    <!-- Dropdown menu content -->
    <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
      <!-- User role display (read-only) -->
      <li>
        <span class="dropdown-item-text d-flex align-items-center justify-content-between" :class="getRoleBadgeClass">
          <i :class="['bi', getRoleIcon]"></i>
          {{ workspaceRole }}

        </span>
      </li>

      <!-- Visual separator -->
      <li>
        <hr class="dropdown-divider">
      </li>

      <!-- Profile action -->
      <li>
        <a href="#" class="dropdown-item" @click.prevent="showProfile">
          <i class="bi bi-person-gear me-2"></i>
          Edit Profile
        </a>
      </li>

      <!-- Logout action -->
      <li>
        <a href="#" class="dropdown-item" @click.prevent="handleLogout">
          <i class="bi bi-box-arrow-right me-2"></i>
          Logout
        </a>
      </li>
    </ul>

    <!-- User Profile Modal -->
    <UserProfileModal v-model="showProfileModal" @save="handleProfileSaved" />
  </li>
</template>

<script setup>
/**
 * UserMenu Component
 * 
 * A reusable dropdown menu component for user-related actions in the navigation bar.
 * Displays the current user's information and provides logout functionality.
 * 
 * Features:
 * - Shows current username with a person icon
 * - Displays user role (Super Administrator or User) or workspace role (Admin, Collaborator, Viewer)
 * - Provides logout functionality
 * - Bootstrap dropdown styling with right-alignment
 * - Accessible dropdown with proper ARIA attributes
 * 
 * Props:
 * @prop {String} workspaceRole - The user's role in the current workspace (admin, collaborator, viewer) or system (superadmin, user)
 * 
 * Usage:
 * <UserMenu workspaceRole="user" />
 * <UserMenu workspaceRole="admin" />
 * 
 * Dependencies:
 * - Vue Router (for navigation after logout)
 * - Users Store (for user data and logout functionality)
 * - Bootstrap CSS and JS (for dropdown functionality)
 * - Bootstrap Icons (for person and logout icons)
 * 
 * @component
 * @example
 * <template>
 *   <nav class="navbar">
 *     <ul class="navbar-nav">
 *       <UserMenu />
 *     </ul>
 *   </nav>
 * </template>
 */

import { useRouter } from 'vue-router'
import { useUsersStore } from '../stores/users'
import { ref } from 'vue'
import UserProfileModal from './modals/UserProfileModal.vue'

// Props
const props = defineProps({
  workspaceRole: {
    type: String,
    default: 'user',
    validator: (value) => ['superadmin', 'admin', 'collaborator', 'viewer', 'user'].includes(value)
  }
})

// Vue Router instance for navigation
const router = useRouter()

// Users store for accessing user data and logout functionality
const usersStore = useUsersStore()

// Profile modal state
const showProfileModal = ref(false)

// Computed properties for workspace role formatting
import { computed } from 'vue'

// Format the workspace role with proper capitalization
const formatWorkspaceRole = computed(() => {
  if (!props.workspaceRole) return '';
  return props.workspaceRole.charAt(0).toUpperCase() + props.workspaceRole.slice(1);
})

// Get the appropriate Bootstrap badge class based on the role
const getRoleBadgeClass = computed(() => {
  switch (props.workspaceRole) {
    case 'superadmin':
      return 'text-danger';
    case 'admin':
      return 'text-primary';
    case 'collaborator':
      return 'text-success';
    case 'viewer':
      return 'text-secondary';
    case 'user':
      return 'text-info';
  }
})

// Get the appropriate Bootstrap icon representing the access level
const getRoleIcon = computed(() => {
  switch (props.workspaceRole) {
    case 'superadmin':
      return 'bi-shield-fill-check'; // Shield icon for superadmin (highest security)
    case 'admin':
      return 'bi-gear-fill'; // Gear icon for admin (configuration powers)
    case 'collaborator':
      return 'bi-pencil-fill'; // Pencil icon for collaborator (editing capabilities)
    case 'viewer':
      return 'bi-eye-fill'; // Eye icon for viewer (read-only access)
    case 'user':
      return 'bi-person-fill'; // Person icon for regular user
  }
})

/**
 * Shows the user profile modal
 * 
 * Opens the profile editing modal where users can update their username and password
 * 
 * @function showProfile
 * @returns {void}
 * 
 * @example
 * // Called when user clicks the "Edit Profile" button
 * showProfile()
 */
function showProfile() {
  showProfileModal.value = true
}

/**
 * Handles successful profile update
 * 
 * Called when the user successfully updates their profile information.
 * Could be used to show notifications or refresh data if needed.
 * 
 * @function handleProfileSaved
 * @returns {void}
 * 
 * @example
 * // Called when profile is successfully updated
 * handleProfileSaved()
 */
function handleProfileSaved() {
  // Profile is automatically updated in the store by the modal
  // Could add notifications here if needed
  console.log('Profile updated successfully')
}

/**
 * Handles user logout process
 * 
 * Performs the following actions:
 * 1. Calls the logout method from the users store
 * 2. Redirects the user to the login page
 * 
 * @async
 * @function handleLogout
 * @returns {Promise<void>}
 * 
 * @example
 * // Called when user clicks the logout button
 * await handleLogout()
 */
async function handleLogout() {
  try {
    await usersStore.logout()
    router.push('/login')
  } catch (error) {
    console.error('Logout error:', error)
    // Still redirect to login even if logout fails
    router.push('/login')
  }
}
</script>