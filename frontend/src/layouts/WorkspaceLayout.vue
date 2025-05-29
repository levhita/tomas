<template>
  <div class="workspace-layout">
    <WorkspaceNavbar :workspace="currentWorkspace" />
    <div class="workspace-content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue';
import WorkspaceNavbar from '../components/WorkspaceNavbar.vue';
import { useWorkspacesStore } from '../stores/workspaces';

const workspacesStore = useWorkspacesStore();

// Get the current workspace object from the store
const currentWorkspace = computed(() => workspacesStore.currentWorkspace);

// Update page title when workspace changes
watch(currentWorkspace, (newWorkspace) => {
  if (newWorkspace?.name) {
    document.title = `${newWorkspace.name}`;
  } else {
    document.title = 'Purrfect Finances';
  }
}, { immediate: true });
</script>

<style scoped>
.workspace-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.workspace-content {
  flex: 1;
}
</style>