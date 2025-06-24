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

          <!-- User menu with workspace role -->
          <UserMenu :workspaceRole="userRole" />
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

import { ref, computed, watch, onMounted } from 'vue'
import UserMenu from '../UserMenu.vue'
import DarkModeToggle from '../DarkModeToggle.vue'
import WorkspaceModal from '../modals/WorkspaceModal.vue'
import CategoriesModal from '../modals/CategoriesModal.vue'
import { useWorkspacesStore } from '../../stores/workspaces'
import { useUsersStore } from '../../stores/users'
import { useToast } from '../../composables/useToast'

const props = defineProps({
  workspace: Object
})

// Store reference for workspace operations
const workspacesStore = useWorkspacesStore()
const usersStore = useUsersStore()
const { showToast } = useToast()

// Computed property to get the user's role in the current workspace
const userRole = computed(() => {
  if (!props.workspace) {
    console.log('No workspace available');
    return null;
  }

  const currentUser = usersStore.currentUser;
  if (!currentUser) {
    console.log('No current user');
    return null;
  }

  // Check if currentWorkspaceUsers is available
  const users = workspacesStore.currentWorkspaceUsers;
  if (!users || !Array.isArray(users) || users.length === 0) {
    console.log('currentWorkspaceUsers not available or empty:', users);
    return null;
  }

  console.log('Current workspace users:', users);
  console.log('Current user ID:', currentUser.id);

  // Find the user's role in the current workspace
  const userEntry = users.find(
    entry => entry.id === currentUser.id
  );

  console.log('User entry found:', userEntry);

  return userEntry?.role || null;
})

// Get a friendly display name and badge color for the role
const roleDisplay = computed(() => {
  switch (userRole.value) {
    case 'admin':
      return { name: 'Admin', class: 'bg-danger' };
    case 'collaborator':
      return { name: 'Collaborator', class: 'bg-success' };
    case 'viewer':
      return { name: 'Viewer', class: 'bg-info' };
    default:
      return { name: 'Unknown', class: 'bg-secondary' };
  }
})

// Component state
const showWorkspaceModal = ref(false)
const workspaceToEdit = ref(null)
const showCategoriesModal = ref(false)

// Method to ensure workspace users are loaded
async function ensureWorkspaceUsersLoaded() {
  console.log('Ensuring workspace users are loaded');

  if (!props.workspace) {
    console.log('No workspace to load users for');
    return;
  }

  try {
    // Always load workspace users to ensure we have the latest data
    console.log('Loading workspace users for workspace ID:', props.workspace.id);
    const users = await workspacesStore.getWorkspaceUsers(props.workspace.id);
    console.log('Loaded users:', users);

    // Directly set the ref value for proper reactivity
    workspacesStore.currentWorkspaceUsers = users;

    // Force a component update by triggering a no-op state change
    const dummy = ref(0);
    dummy.value++;
  } catch (error) {
    console.error('Error loading workspace users:', error);
  }
}

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

    showToast({
      title: 'Success',
      message: 'Workspace updated successfully!',
      variant: 'success'
    })
  } catch (error) {
    console.error('Error updating workspace:', error)

    showToast({
      title: 'Error',
      message: `Error updating workspace: ${error.message}`,
      variant: 'danger'
    })
  }
}

// Load workspace users when component is mounted
onMounted(() => {
  console.log('Component mounted, ensuring workspace users are loaded');
  if (props.workspace) {
    ensureWorkspaceUsersLoaded();
  }
})

// Watch for changes in the workspace prop
watch(() => props.workspace, async (newWorkspace) => {
  console.log('Workspace changed:', newWorkspace);
  if (newWorkspace) {
    await ensureWorkspaceUsersLoaded();
  }
}, { immediate: true })
</script>
