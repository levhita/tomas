<template>
  <!-- Workspace-specific navbar -->
  <nav class="navbar navbar-expand-lg bg-body-secondary p-3">
    <div class="container-fluid">
      <!-- Brand logo with link to workspaces -->
      <RouterLink class="me-2" to="/workspaces">
        <img src="/logo/logo_128.png" alt="Tomás - Purrfect Budgets" class="navbar-logo">
      </RouterLink>

      <span v-if="workspace" class="fw-bold fs-4">
        {{ workspace.name }}
      </span>

      <!-- Mobile toggle button -->
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav"
        aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>

      <!-- Navigation content -->
      <div class="collapse navbar-collapse" id="navbarNav">
        <!-- Left-aligned nav items -->
        <ul class="navbar-nav me-auto">
          <li class="nav-item">
            <!-- Calendar link -->
            <RouterLink v-if="workspace" class="nav-link" active-class="active"
              :to="{ path: '/calendar', query: { workspaceId: workspace.id } }">
              <i class="bi bi-calendar-week me-1"></i>
              Calendar
            </RouterLink>
          </li>

          <li class="nav-item">
            <!-- Categories button -->
            <button v-if="workspace" class="btn btn-link nav-link" @click="openCategoriesModal">
              <i class="bi bi-tags me-1"></i>
              Categories
            </button>
          </li>
        </ul>

        <!-- Right-aligned nav items -->
        <ul class="navbar-nav">
          <!-- Workspace settings button -->
          <li v-if="workspace" class="nav-item me-2">
            <button class="btn btn-link nav-link" title="Workspace settings" @click="openWorkspaceSettings">
              <i class="bi bi-gear"></i>
            </button>
          </li>

          <!-- Dark mode toggle -->
          <DarkModeToggle />

          <!-- Back to workspaces link -->
          <li v-if="workspace" class="nav-item me-2">
            <RouterLink class="nav-link" to="/workspaces" title="Back to workspaces">
              <i class="bi bi-grid-3x3-gap me-1"></i>
              Workspaces
            </RouterLink>
          </li>

          <!-- User menu -->
          <UserMenu />
        </ul>
      </div>
    </div>
  </nav>

  <!-- Workspace settings modal -->
  <WorkspaceModal v-model="showWorkspaceModal" :workspace="workspaceToEdit" :isLoading="workspacesStore.isLoading"
    @save="handleSaveWorkspace" />

  <!-- Categories management modal -->
  <CategoriesModal v-model="showCategoriesModal" :workspace="workspace" />
</template>

<script setup>
/**
 * WorkspaceNavbar Component
 * 
 * Navigation bar for workspace-scoped pages that provides workspace context,
 * navigation, and user controls with responsive design.
 * 
 * Props:
 * @prop {Object} workspace - Current workspace object with id, name, etc.
 */

import { ref } from 'vue'
import UserMenu from '../UserMenu.vue'
import DarkModeToggle from '../DarkModeToggle.vue'
import WorkspaceModal from '../modals/WorkspaceModal.vue'
import CategoriesModal from '../modals/CategoriesModal.vue'
import { useWorkspacesStore } from '../../stores/workspaces'

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
