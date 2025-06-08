<template>
  <!-- 
    Main layout wrapper for workspace-specific pages
    Uses flexbox to ensure navbar stays at top and content fills remaining space
  -->
  <div class="workspace-layout">
    <!-- 
      Workspace-specific navigation bar
      Displays workspace name and workspace-specific navigation options
    -->
    <WorkspaceNavbar :workspace="currentWorkspace" />

    <!-- 
      Main content area where page components are rendered
      Uses slot to allow any content to be inserted by parent components
    -->
    <div class="workspace-content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
/**
 * WorkspaceLayout Component
 * 
 * A layout component specifically designed for workspace-scoped pages.
 * Provides a consistent structure with workspace-specific navigation and
 * dynamic page title management based on the current workspace.
 * 
 * Features:
 * - Displays WorkspaceNavbar with current workspace information
 * - Automatically updates page title to show workspace name
 * - Provides flexible content area through slot system
 * - Maintains full viewport height layout with sticky navigation
 * - Integrates with workspace store for reactive workspace data
 * 
 * Page Title Management:
 * - Format: "{workspace.name}" (just the workspace name)
 * - Falls back to "Purrfect Finances" if no workspace is loaded
 * - Updates immediately when workspace changes (immediate: true)
 * - Useful for browser tab identification when working with multiple workspaces
 * 
 * Layout Structure:
 * - Fixed navbar at top
 * - Flexible content area that grows to fill remaining space
 * - Full viewport height (100vh) layout
 * - Responsive design compatible
 * 
 * Usage:
 * <WorkspaceLayout>
 *   <YourPageContent />
 * </WorkspaceLayout>
 * 
 * Dependencies:
 * - Vue 3 Composition API (computed, watch)
 * - WorkspaceNavbar component
 * - Workspaces store (for current workspace data)
 * 
 * @component
 * @example
 * <template>
 *   <WorkspaceLayout>
 *     <div class="container">
 *       <h1>Calendar View</h1>
 *       <!-- Calendar content here -->
 *     </div>
 *   </WorkspaceLayout>
 * </template>
 */

import { computed, watch } from 'vue';
import WorkspaceNavbar from '../components/WorkspaceNavbar.vue';
import { useWorkspacesStore } from '../stores/workspaces';

// Access the workspaces store for reactive workspace data
const workspacesStore = useWorkspacesStore();

/**
 * Computed property that reactively returns the current workspace
 * 
 * This computed property automatically updates when the workspace store's
 * currentWorkspace changes, ensuring the layout always reflects the
 * most up-to-date workspace information.
 * 
 * @type {import('vue').ComputedRef<Object|null>}
 * @returns {Object|null} Current workspace object or null if none selected
 * 
 * @example
 * // Workspace object structure:
 * {
 *   id: 1,
 *   name: "Personal Budget",
 *   description: "My personal finances",
 *   created_at: "2024-01-01T00:00:00Z"
 * }
 */
// Get the current workspace object from the store
const currentWorkspace = computed(() => workspacesStore.currentWorkspace);

/**
 * Watcher for dynamic page title updates
 * 
 * Automatically updates the browser's page title whenever the current
 * workspace changes. This provides better user experience by showing
 * the workspace name in the browser tab.
 * 
 * Title formats:
 * - With workspace: "{workspace.name}" (e.g., "Personal Budget")
 * - Without workspace: "Purrfect Finances"
 * 
 * The immediate: true option ensures the title is set when the component
 * mounts, handling cases where workspace is already loaded during initialization.
 * 
 * @param {Object|null} newWorkspace - The new workspace object
 * 
 * @example
 * // When workspace changes to "Personal Budget":
 * // document.title becomes "Personal Budget"
 */
// Update page title when workspace changes
watch(currentWorkspace, (newWorkspace) => {
  if (newWorkspace?.name) {
    document.title = `${newWorkspace.name}`;
  } else {
    document.title = 'Tomás - Purrfect Budgets';
  }
}, { immediate: true });
</script>

<style scoped>
/**
 * Layout-specific styles for workspace pages
 * 
 * Creates a full-height flexible layout where the navbar stays fixed
 * at the top and the content area expands to fill remaining space.
 */

/**
 * Main layout container
 * 
 * Uses flexbox column layout to stack navbar and content vertically.
 * min-height: 100vh ensures the layout always fills the full viewport height,
 * even when content is minimal.
 */
.workspace-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/**
 * Content area styling
 * 
 * flex: 1 makes this area grow to fill all available space
 * after the navbar takes its required height. This ensures
 * the footer-like behavior where content fills the viewport.
 */
.workspace-content {
  flex: 1;
}
</style>