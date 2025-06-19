<template>
  <!-- 
    Workspace-specific navigation bar
    Adapts styling based on dark/light mode and displays workspace context
  -->
  <nav class="navbar navbar-expand-lg bg-body-secondary p-3">
    <div class="container-fluid">
      <!-- 
        Brand logo and name - always links back to workspaces overview
        Provides consistent branding across all workspace pages
      -->
      <RouterLink class="me-2" to="/workspaces">
        <img src="/logo/logo_128.png" alt="Tomás - Purrfect Budgets" class="navbar-logo">
      </RouterLink>

      <span v-if="workspace" class="fw-bold fs-4">
        {{ workspace.name }}
      </span>

      <!-- 
        Mobile menu toggle button
        Standard Bootstrap navbar toggler for responsive design
      -->
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav"
        aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>

      <!-- 
        Collapsible navigation content
        Contains workspace-specific navigation and user controls
      -->
      <div class="collapse navbar-collapse" id="navbarNav">
        <!-- 
          Left-aligned navigation items
          Workspace-specific page navigation
        -->
        <ul class="navbar-nav me-auto">
          <li class="nav-item">
            <!-- 
              Calendar navigation link
              Only shown when workspace is active, includes workspaceId in query params
            -->
            <RouterLink v-if="workspace" class="nav-link" active-class="active"
              :to="{ path: '/calendar', query: { workspaceId: workspace.id } }">
              <i class="bi bi-calendar-week me-1"></i>
              Calendar
            </RouterLink>
          </li>

          <li class="nav-item">
            <!-- 
              Categories management button
              Opens CategoriesModal for managing workspace categories
              Only visible when workspace is active
            -->
            <button v-if="workspace" class="btn btn-link nav-link" @click="openCategoriesModal">
              <i class="bi bi-tags me-1"></i>
              Categories
            </button>
          </li>
          <!-- Additional workspace-specific navigation items can be added here -->
        </ul>

        <!-- 
          Right-aligned navigation items
          User controls and workspace utilities
        -->
        <ul class="navbar-nav">
          <!-- 
            Workspace settings button
            Opens WorkspaceModal for editing current workspace
            Only visible when workspace is active
          -->
          <li v-if="workspace" class="nav-item me-2">
            <button class="btn btn-link nav-link" title="Workspace settings" @click="openWorkspaceSettings">
              <i class="bi bi-gear"></i>
            </button>
          </li>

          <!-- 
            Dark mode toggle component
            Reusable component for theme switching
          -->
          <DarkModeToggle />

          <!-- 
            Back to workspaces link
            Quick navigation back to workspace overview
            Only visible when workspace is active
          -->
          <li v-if="workspace" class="nav-item me-2">
            <RouterLink class="nav-link" to="/workspaces" title="Back to workspaces">
              <i class="bi bi-grid-3x3-gap me-1"></i>
              Workspaces
            </RouterLink>
          </li>

          <!-- 
            User menu component
            Reusable component for user account actions
          -->
          <UserMenu />
        </ul>
      </div>
    </div>
  </nav>

  <!-- 
    Workspace settings modal
    Uses the reusable WorkspaceModal component for editing workspace details
  -->
  <WorkspaceModal v-model="showWorkspaceModal" :workspace="workspaceToEdit" :isLoading="workspacesStore.isLoading"
    @save="handleSaveWorkspace" />

  <!-- 
    Categories management modal
    Uses the CategoriesModal component for managing workspace categories
  -->
  <CategoriesModal v-model="showCategoriesModal" :workspace="workspace" />
</template>

<script setup>
/**
 * WorkspaceNavbar Component
 * 
 * A specialized navigation bar component designed for workspace-scoped pages.
 * Provides workspace context, navigation, and user controls while maintaining
 * consistent branding and responsive design.
 * 
 * Features:
 * - Displays current workspace name with visual badge
 * - Workspace-specific navigation (Calendar, etc.)
 * - Quick navigation back to workspaces overview
 * - Integrated dark mode toggle
 * - User menu with account actions
 * - Workspace settings modal for editing workspace details
 * - Responsive mobile-friendly design
 * - Theme-aware styling (dark/light mode)
 * 
 * Props:
 * @prop {Object} workspace - Current workspace object containing id, name, etc.
 * 
 * Workspace Object Structure:
 * {
 *   id: number,           // Unique workspace identifier
 *   name: string,         // Display name for the workspace
 *   note?: string, // Optional workspace note
 *   created_at?: string   // Optional creation timestamp
 * }
 * 
 * Navigation Structure:
 * - Brand: Links to /workspaces (always visible)
 * - Workspace Badge: Shows current workspace name (conditional)
 * - Calendar Link: Links to /calendar with workspaceId query (conditional)
 * - Settings Button: Opens workspace edit modal (conditional)
 * - Dark Mode Toggle: Theme switching control (always visible)
 * - Workspaces Link: Quick return to overview (conditional)
 * - User Menu: Account actions and logout (always visible)
 * 
 * Responsive Behavior:
 * - Collapses navigation items on mobile devices
 * - Maintains workspace badge visibility on all screen sizes
 * - Uses Bootstrap's navbar component for consistent behavior
 * 
 * Theme Integration:
 * - Automatically adapts colors based on dark/light mode
 * - Uses Bootstrap's theme system (data-bs-theme)
 * - Workspace badge styling adapts to theme
 * 
 * Usage:
 * <WorkspaceNavbar :workspace="currentWorkspace" />
 * 
 * Dependencies:
 * - Vue 3 Composition API
 * - Vue Router (for navigation links)
 * - Bootstrap CSS/JS (for navbar functionality)
 * - Bootstrap Icons (for all icons)
 * - UserMenu component
 * - DarkModeToggle component
 * - WorkspaceModal component
 * - Workspaces store (for updating workspace data)
 * 
 * @component
 * @example
 * <template>
 *   <WorkspaceNavbar :workspace="{ id: 1, name: 'Personal Budget' }" />
 * </template>
 */

import { ref } from 'vue'
import UserMenu from './UserMenu.vue'
import DarkModeToggle from './DarkModeToggle.vue'
import WorkspaceModal from './modals/WorkspaceModal.vue'
import CategoriesModal from './modals/CategoriesModal.vue'
import { useWorkspacesStore } from '../stores/workspaces'

const props = defineProps({
  workspace: Object
})

// Store reference for workspace operations
const workspacesStore = useWorkspacesStore()

// Component state
const showWorkspaceModal = ref(false)
const workspaceToEdit = ref(null)
const showCategoriesModal = ref(false)

function openWorkspaceSettings() {
  if (props.workspace) {
    workspaceToEdit.value = props.workspace
    showWorkspaceModal.value = true
  }
}

function openCategoriesModal() {
  if (props.workspace) {
    showCategoriesModal.value = true
  }
}

async function handleSaveWorkspace(workspaceData) {
  try {
    await workspacesStore.saveWorkspace(workspaceData)
    showWorkspaceModal.value = false
  } catch (error) {
    console.error('Error updating workspace:', error)
    alert('Error updating workspace: ' + error.message)
  }
}
</script>