<template>
  <!-- 
    Admin-specific navigation bar
    Provides navigation for administrative functions and maintains consistent branding
  -->
  <nav class="navbar navbar-expand-lg bg-body-secondary p-3 admin-nav">
    <div class="container-fluid">
      <!-- 
        Brand logo and admin section indicator
        Links back to main books for quick navigation
      -->
      <RouterLink class="me-2" to="/books">
        <img src="/logo/logo_128.png" alt="Tomás - Purrfect Budgets" class="navbar-logo">
      </RouterLink>

      <div class="d-flex align-items-center me-2">
        <span class="fw-bold fs-4">Admin</span>
      </div>

      <!-- 
        Mobile menu toggle button
        Standard Bootstrap navbar toggler for responsive design
      -->
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#adminNavbarNav"
        aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>

      <!-- 
        Collapsible navigation content
        Contains admin-specific navigation and user controls
      -->
      <div class="collapse navbar-collapse" id="adminNavbarNav">
        <!-- 
          Left-aligned navigation items
          Admin-specific page navigation
        -->
        <ul class="navbar-nav me-auto">
          <li class="nav-item">
            <RouterLink class="nav-link" active-class="active" to="/admin">
              <i class="bi bi-speedometer2 me-1"></i>
              Dashboard
            </RouterLink>
          </li>

          <li class="nav-item">
            <RouterLink class="nav-link" active-class="active" to="/admin/users">
              <i class="bi bi-people me-1"></i>
              Users
            </RouterLink>
          </li>

          <!-- Add more admin navigation items as needed -->
        </ul>

        <!-- 
          Right-aligned navigation items
          User controls and admin utilities
        -->
        <ul class="navbar-nav">

          <!-- 
            Dark mode toggle component
            Reusable component for theme switching
          -->
          <DarkModeToggle />

          <!-- 
            User menu component
            Reusable component for user account actions
          -->
          <UserMenu :bookRole="usersStore.isSuperAdmin ? 'superadmin' : 'user'" />
        </ul>
      </div>
    </div>
  </nav>
</template>

<script setup>
/**
 * AdminNavbar Component
 * 
 * A specialized navigation bar component designed for administrative pages.
 * Provides admin-specific navigation, system status indicators, and quick
 * access to main application while maintaining consistent branding.
 * 
 * Features:
 * - Admin section branding with gear icon
 * - Admin-specific navigation (Dashboard, Users, Books, Settings)
 * - Super Admin role indicator
 * - Quick navigation back to main application
 * - Integrated dark mode toggle
 * - User menu with account actions
 * - Responsive mobile-friendly design
 * - Theme-aware styling (dark/light mode)
 * 
 * Navigation Structure:
 * - Brand: Links to /books (always visible)
 * - Admin Badge: Shows "Administration" with gear icon
 * - Dashboard Link: Links to /admin (admin overview)
 * - Users Link: Links to /admin/users (user management)
 * - Books Link: Links to /admin/books (book management)
 * - Settings Link: Links to /admin/settings (system settings)
 * - Super Admin Badge: Shows current user's admin status
 * - Dark Mode Toggle: Theme switching control
 * - Main App Link: Quick return to books
 * - User Menu: Account actions and logout
 * 
 * Responsive Behavior:
 * - Collapses navigation items on mobile devices
 * - Maintains admin badge visibility on all screen sizes
 * - Uses Bootstrap's standard navbar collapse functionality
 * 
 * Styling:
 * - Uses Bootstrap navbar classes for consistency
 * - Follows project color scheme and spacing patterns
 * - Uses Bootstrap icons for all navigation elements
 * - Adapts to dark/light themes automatically
 * 
 * Usage:
 * <AdminNavbar />
 * 
 * Dependencies:
 * - Vue 3 Composition API
 * - Vue Router (for navigation links)
 * - Bootstrap CSS/JS (for navbar functionality)
 * - Bootstrap Icons (for all icons)
 * - UserMenu component
 * - DarkModeToggle component
 * - Users store (for admin status verification)
 * 
 * @component
 * @example
 * <template>
 *   <AdminNavbar />
 * </template>
 */

import UserMenu from '../UserMenu.vue'
import DarkModeToggle from '../DarkModeToggle.vue'
import { useUsersStore } from '../../stores/users'

// Store reference for user authentication and admin status
const usersStore = useUsersStore()
</script>
