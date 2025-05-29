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
              <p class="card-text" v-if="workspace.description">{{ workspace.description }}</p>
              <p class="card-text" v-else><em>No description</em></p>
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

      <!-- New/Edit Workspace Modal -->
      <div class="modal fade" id="workspaceModal" tabindex="-1" ref="workspaceModal">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">{{ isEditing ? 'Edit' : 'New' }} Workspace</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <form @submit.prevent="saveWorkspace">
                <div class="mb-3">
                  <label for="workspaceName" class="form-label">Name</label>
                  <input type="text" class="form-control" id="workspaceName" v-model="workspaceForm.name" required>
                </div>
                <div class="mb-3">
                  <label for="workspaceDescription" class="form-label">Description</label>
                  <textarea class="form-control" id="workspaceDescription" v-model="workspaceForm.description"
                    rows="3"></textarea>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-primary" @click="saveWorkspace"
                :disabled="workspacesStore.isLoading">
                {{ workspacesStore.isLoading ? 'Saving...' : 'Save' }}
              </button>
            </div>
          </div>
        </div>
      </div>

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
import { Modal } from 'bootstrap';
import GeneralLayout from '../layouts/GeneralLayout.vue';

const router = useRouter();
const workspacesStore = useWorkspacesStore();

const workspaceModal = ref(null);
const deleteModal = ref(null);
const workspaceForm = ref({ name: '', description: '' });
const isEditing = ref(false);
const workspaceToDelete = ref(null);

let bsWorkspaceModal = null;
let bsDeleteModal = null;

onMounted(async () => {
  // Initialize bootstrap modals
  bsWorkspaceModal = new Modal(workspaceModal.value);
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
  workspaceForm.value = { name: '', description: '' };
  isEditing.value = false;
  bsWorkspaceModal.show();
}

function editWorkspace(workspace) {
  workspaceForm.value = {
    name: workspace.name,
    description: workspace.description || '',
    id: workspace.id
  };
  isEditing.value = true;
  bsWorkspaceModal.show();
}

async function saveWorkspace() {
  try {
    if (isEditing.value) {
      await workspacesStore.updateWorkspace(workspaceForm.value.id, {
        name: workspaceForm.value.name,
        description: workspaceForm.value.description
      });
    } else {
      await workspacesStore.createWorkspace({
        name: workspaceForm.value.name,
        description: workspaceForm.value.description
      });
    }
    bsWorkspaceModal.hide();
  } catch (error) {
    alert('Error saving workspace: ' + error.message);
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
  } catch (error) {
    alert('Error deleting workspace: ' + error.message);
  }
}

function selectWorkspace(workspace) {
  // Replace the current URL with the workspace URL
  // Using replace: true ensures we don't build up history stack
  router.push({
    path: '/calendar',
    query: {
      workspaceId: workspace.id,
    },
    replace: false
  });
}
</script>

<style scoped>
.workspace-card {
  transition: transform 0.2s, box-shadow 0.2s;
  border: 1px solid rgba(0, 0, 0, 0.125);
}

.workspace-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.card-footer {
  border-top: 1px solid rgba(0, 0, 0, 0.125);
  padding: 0.75rem 1rem;
}
</style>