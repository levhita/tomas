<template>
  <!-- User dropdown menu for navbar navigation -->
  <li class="nav-item dropdown">
    <!-- Dropdown trigger button showing user avatar and username -->
    <a class="nav-link dropdown-toggle" href="#" id="userDropdown" role="button" data-bs-toggle="dropdown"
      aria-expanded="false">
      <i class="bi bi-person-circle me-1"></i>
      {{ usersStore.currentUser?.username || 'User' }}
    </a>

    <!-- Dropdown menu content -->
    <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
      <!-- User role display (read-only) -->
      <li>
        <span class="dropdown-item-text">
          <small class="text-muted">
            {{ usersStore.isSuperAdmin ? 'Super Admin' : 'User' }}
          </small>
        </span>
      </li>

      <!-- Visual separator -->
      <li>
        <hr class="dropdown-divider">
      </li>

      <!-- Logout action -->
      <li>
        <a href="#" class="dropdown-item" @click.prevent="handleLogout">
          <i class="bi bi-box-arrow-right me-2"></i>
          Logout
        </a>
      </li>
    </ul>
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
 * - Displays user role (Super Administrator or User)
 * - Provides logout functionality
 * - Bootstrap dropdown styling with right-alignment
 * - Accessible dropdown with proper ARIA attributes
 * 
 * Usage:
 * <UserMenu />
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

// Vue Router instance for navigation
const router = useRouter()

// Users store for accessing user data and logout functionality
const usersStore = useUsersStore()

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

<style scoped>
/**
 * Component-specific styles
 * 
 * Ensures proper spacing and alignment for dropdown items
 */

/**
 * Styling for non-clickable dropdown text items
 * Provides consistent padding to match other dropdown items
 */
.dropdown-item-text {
  padding: 0.25rem 1rem;
}
</style>