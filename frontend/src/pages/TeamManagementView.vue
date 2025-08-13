<template>
  <GeneralLayout>
    <div class="team-management container">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1>Team Management</h1>
          <small class="text-muted">Team: {{ usersStore.currentTeam?.name }}</small>
        </div>
        <div>
          <button class="btn btn-secondary me-2" @click="goBack">
            <i class="bi bi-arrow-left me-2"></i>Back to Books
          </button>
          <button class="btn btn-primary" @click="showAddUserModal">
            <i class="bi bi-person-plus me-2"></i>Add User
          </button>
        </div>
      </div>

      <div v-if="isLoading" class="text-center my-5">
        <div class="spinner-border" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>

      <div v-else-if="error" class="alert alert-danger">
        {{ error }}
      </div>

      <div v-else>
        <div class="card">
          <div class="card-header">
            <h5 class="card-title mb-0">Team Members</h5>
          </div>
          <div class="card-body">
            <div v-if="teamUsers.length === 0" class="text-center py-4">
              <p class="text-muted">No team members found.</p>
            </div>
            <div v-else class="table-responsive">
              <table class="table table-striped">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="user in teamUsers" :key="user.id">
                    <td>
                      <div class="d-flex align-items-center">
                        <i class="bi bi-person-circle me-2"></i>
                        {{ user.username }}
                        <span v-if="user.id === usersStore.currentUser?.id" class="badge bg-primary ms-2">You</span>
                      </div>
                    </td>
                    <td>
                      <span class="badge" :class="getRoleBadgeClass(user.role)">
                        {{ formatRole(user.role) }}
                      </span>
                    </td>
                    <td>{{ formatDate(user.created_at) }}</td>
                    <td>
                      <div class="btn-group btn-group-sm">
                        <button 
                          class="btn btn-outline-primary" 
                          @click="showChangeRoleModal(user)"
                          :disabled="user.id === usersStore.currentUser?.id"
                          title="Change Role">
                          <i class="bi bi-shield-check"></i>
                        </button>
                        <button 
                          class="btn btn-outline-danger" 
                          @click="confirmRemoveUser(user)"
                          :disabled="user.id === usersStore.currentUser?.id || isLastAdmin(user)"
                          title="Remove User">
                          <i class="bi bi-person-dash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Add User Modal -->
      <AddUserModal 
        v-model="showAddUser" 
        :teamId="usersStore.currentTeam?.id"
        @user-added="handleUserAdded"
      />

      <!-- Change Role Modal -->
      <div class="modal fade" id="changeRoleModal" tabindex="-1" ref="changeRoleModal">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Change User Role</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <p>Change role for user: <strong>{{ selectedUser?.username }}</strong></p>
              <div class="form-group">
                <label for="newRole" class="form-label">New Role:</label>
                <select id="newRole" class="form-select" v-model="newRole">
                  <option value="admin">Admin</option>
                  <option value="collaborator">Collaborator</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-primary" @click="changeUserRole" :disabled="isLoading">
                {{ isLoading ? 'Changing...' : 'Change Role' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </GeneralLayout>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUsersStore } from '../stores/users';
import { useToast } from '../composables/useToast';
import { useConfirm } from '../composables/useConfirm';
import { Modal } from 'bootstrap';
import GeneralLayout from '../layouts/GeneralLayout.vue';
import AddUserModal from '../components/modals/AddUserModal.vue';
import fetchWithAuth from '../utils/fetch';

const router = useRouter();
const usersStore = useUsersStore();
const { showToast } = useToast();
const { confirm } = useConfirm();

// Component state
const isLoading = ref(false);
const error = ref(null);
const teamUsers = ref([]);
const showAddUser = ref(false);
const selectedUser = ref(null);
const newRole = ref('viewer');

// Modal references
const changeRoleModal = ref(null);

let bsChangeRoleModal = null;

onMounted(async () => {
  // Initialize Bootstrap modals
  bsChangeRoleModal = new Modal(changeRoleModal.value);

  // Check if user has selected a team
  if (!usersStore.hasSelectedTeam) {
    router.push('/login');
    return;
  }

  // Check if user is admin
  if (!usersStore.isCurrentUserAdmin) {
    showToast({
      title: 'Access Denied',
      message: 'Only team administrators can manage team members.',
      variant: 'danger'
    });
    router.push('/books');
    return;
  }

  await fetchTeamUsers();
});

async function fetchTeamUsers() {
  if (!usersStore.currentTeam?.id) return;

  try {
    isLoading.value = true;
    error.value = null;

    const response = await fetchWithAuth(`/api/teams/${usersStore.currentTeam.id}/users`);
    const data = await response.json();
    teamUsers.value = data || [];
  } catch (err) {
    error.value = err.message || 'Failed to load team users';
    console.error('Error fetching team users:', err);
  } finally {
    isLoading.value = false;
  }
}

function goBack() {
  router.push('/books');
}

function showAddUserModal() {
  showAddUser.value = true;
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

function formatRole(role) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function getRoleBadgeClass(role) {
  switch (role) {
    case 'admin': return 'bg-danger';
    case 'collaborator': return 'bg-warning';
    case 'viewer': return 'bg-secondary';
    default: return 'bg-secondary';
  }
}

function isLastAdmin(user) {
  if (user.role !== 'admin') return false;
  const adminCount = teamUsers.value.filter(u => u.role === 'admin').length;
  return adminCount === 1;
}

function showChangeRoleModal(user) {
  selectedUser.value = user;
  newRole.value = user.role;
  bsChangeRoleModal.show();
}

function confirmRemoveUser(user) {
  selectedUser.value = user;
  removeUser();
}

async function changeUserRole() {
  if (!selectedUser.value || !usersStore.currentTeam?.id) return;

  try {
    isLoading.value = true;

    const response = await fetchWithAuth(`/api/teams/${usersStore.currentTeam.id}/users/${selectedUser.value.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        role: newRole.value
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to change user role');
    }

    // Update the user in the local list
    const userIndex = teamUsers.value.findIndex(u => u.id === selectedUser.value.id);
    if (userIndex !== -1) {
      teamUsers.value[userIndex].role = newRole.value;
    }

    bsChangeRoleModal.hide();

    showToast({
      title: 'Success',
      message: `User role changed to ${formatRole(newRole.value)}`,
      variant: 'success'
    });
  } catch (err) {
    showToast({
      title: 'Error',
      message: `Failed to change user role: ${err.message}`,
      variant: 'danger'
    });
  } finally {
    isLoading.value = false;
  }
}

async function removeUser() {
  if (!selectedUser.value || !usersStore.currentTeam?.id) return;

  try {
    await confirm({
      title: 'Remove User',
      message: `Are you sure you want to remove <strong>${selectedUser.value.username}</strong> from the team?<br>This action cannot be undone.`,
      confirmText: 'Remove User',
      confirmButtonVariant: 'danger'
    });

    isLoading.value = true;

    const response = await fetchWithAuth(`/api/teams/${usersStore.currentTeam.id}/users/${selectedUser.value.id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to remove user');
    }

    // Remove the user from the local list
    teamUsers.value = teamUsers.value.filter(u => u.id !== selectedUser.value.id);

    showToast({
      title: 'Success',
      message: 'User removed from team successfully',
      variant: 'success'
    });
  } catch (err) {
    if (err.message !== 'User canceled') {
      showToast({
        title: 'Error',
        message: `Failed to remove user: ${err.message}`,
        variant: 'danger'
      });
    }
  } finally {
    isLoading.value = false;
  }
}

async function handleUserAdded() {
  // Refresh the team users list
  await fetchTeamUsers();
  showToast({
    title: 'Success',
    message: 'User added to team successfully',
    variant: 'success'
  });
}
</script>
