<template>
  <div class="workspace-layout">
    <WorkspaceNavbar :workspace="currentWorkspace" />
    <div class="workspace-content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import WorkspaceNavbar from '../components/WorkspaceNavbar.vue';
import { useWorkspacesStore } from '../stores/workspaces';

const workspacesStore = useWorkspacesStore();

// Get the current workspace object from the store
const currentWorkspace = computed(() => workspacesStore.currentWorkspace);
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