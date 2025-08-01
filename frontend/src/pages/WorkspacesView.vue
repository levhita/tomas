<template>
  <GeneralLayout>
    <div class="home container-fluid">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h1>Workspaces</h1>
        <button class="btn btn-primary" @click="showNewWorkspaceModal">
          <i class="bi bi-plus-circle me-2"></i>New Workspace
        </button>
      </div>

      <div v-if="workspacesStore.isLoading" class="text-center my-5">
        <div class="spinner-border" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>

      <div v-else-if="workspacesStore.error" class="alert alert-danger">
        {{ workspacesStore.error }}
      </div>

      <div v-else-if="workspacesStore.workspaces.length === 0" class="text-center my-5">
        <div class="alert alert-info">
          <i class="bi bi-info-circle me-2"></i>
          No workspaces found. Create your first workspace to get started.
        </div>
      </div>

      <div v-else class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
        <div v-for="workspace in workspacesStore.workspacesByName" :key="workspace.id" class="col">
          <div class="card h-100 workspace-card">
            <div class="card-body">
              <h5 class="card-title">{{ workspace.name }}</h5>
              <p class="card-text text-muted small">
                Created {{ formatDate(workspace.created_at) }}
              </p>
              <p class="card-text" v-if="workspace.note">{{ workspace.note }}</p>
              <p class="card-text" v-else><em>No note</em></p>
            </div>
            <div class="card-footer bg-transparent d-flex justify-content-between">
              <button class="btn btn-sm btn-primary" @click="selectWorkspace(workspace)">
                <i class="bi bi-folder2-open me-1"></i>Open
              </button>
              <div>
                <button class="btn btn-sm btn-outline-secondary me-1" @click="editWorkspace(workspace)"
                  aria-label="Edit">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" @click="confirmDeleteWorkspace(workspace)"
                  aria-label="Delete">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Workspace Modal Component -->
      <WorkspaceModal v-model="showWorkspaceModal" :workspace="selectedWorkspace" :isLoading="workspacesStore.isLoading"
        @save="handleSaveWorkspace" />

      <!-- Delete Confirmation Modal -->
      <div class="modal fade" id="deleteModal" tabindex="-1" ref="deleteModal">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Confirm Delete</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              Are you sure you want to delete the workspace "{{ workspaceToDelete?.name }}"?
              This action cannot be undone.
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-danger" @click="deleteWorkspace"
                :disabled="workspacesStore.isLoading">
                {{ workspacesStore.isLoading ? 'Deleting...' : 'Delete' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </GeneralLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useWorkspacesStore } from '../stores/workspaces';
import { useToast } from '../composables/useToast';
import { Modal } from 'bootstrap';
import GeneralLayout from '../layouts/GeneralLayout.vue';
import WorkspaceModal from '../components/modals/WorkspaceModal.vue';

const router = useRouter();
const workspacesStore = useWorkspacesStore();
const { showToast } = useToast();

// Component state
const showWorkspaceModal = ref(false)
const selectedWorkspace = ref(null)
const deleteModal = ref(null);
const workspaceToDelete = ref(null);

let bsDeleteModal = null;

onMounted(async () => {
  // Initialize bootstrap delete modal
  bsDeleteModal = new Modal(deleteModal.value);

  // Fetch workspaces
  try {
    await workspacesStore.fetchWorkspaces();
  } catch (error) {
    console.error('Failed to load workspaces', error);
  }
});

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

function showNewWorkspaceModal() {
  selectedWorkspace.value = null
  showWorkspaceModal.value = true
}

function editWorkspace(workspace) {
  selectedWorkspace.value = workspace
  showWorkspaceModal.value = true
}

async function handleSaveWorkspace(workspaceData) {
  try {
    await workspacesStore.saveWorkspace(workspaceData)
    showWorkspaceModal.value = false

    showToast({
      title: 'Success',
      message: `Workspace ${workspaceData.id ? 'updated' : 'created'} successfully!`,
      variant: 'success'
    })
  } catch (error) {
    showToast({
      title: 'Error',
      message: `Error saving workspace: ${error.message}`,
      variant: 'danger'
    })
  }
}

function confirmDeleteWorkspace(workspace) {
  workspaceToDelete.value = workspace;
  bsDeleteModal.show();
}

async function deleteWorkspace() {
  if (!workspaceToDelete.value) return;

  try {
    await workspacesStore.deleteWorkspace(workspaceToDelete.value.id);
    bsDeleteModal.hide();

    showToast({
      title: 'Success',
      message: 'Workspace deleted successfully!',
      variant: 'success'
    })
  } catch (error) {
    showToast({
      title: 'Error',
      message: `Error deleting workspace: ${error.message}`,
      variant: 'danger'
    })
  }
}

function selectWorkspace(workspace) {
  router.push({
    path: '/calendar',
    query: {
      workspaceId: workspace.id,
    },
    replace: false
  });
}
</script>