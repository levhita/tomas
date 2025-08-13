<template>
  <div class="modal fade" id="addTeamModal" tabindex="-1" aria-labelledby="addTeamModalLabel" aria-hidden="true">
    <div class="modal-dialog">
      <div class="modal-content">
        <!-- Modal Header -->
        <div class="modal-header">
          <h3 class="modal-title fs-5" id="addTeamModalLabel">Add {{ username }} to Team</h3>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>

        <!-- Modal Body -->
        <div class="modal-body">
          <form @submit.prevent="handleSubmit">
            <!-- Team Search -->
            <div class="mb-3">
              <div class="form-floating">
                <input 
                  type="text" 
                  class="form-control" 
                  id="teamSearch" 
                  v-model="searchQuery" 
                  @input="handleSearchInput"
                  placeholder="Search teams..."
                  autocomplete="off"
                >
                <label for="teamSearch">Search Teams</label>
              </div>
              
              <!-- Search Results -->
              <div v-if="searchQuery.trim().length > 0" class="mt-2">
                <div v-if="isSearching" class="text-center py-2">
                  <div class="spinner-border spinner-border-sm" role="status">
                    <span class="visually-hidden">Searching...</span>
                  </div>
                  <span class="ms-2">Searching teams...</span>
                </div>
                
                <div v-else-if="searchResults.length === 0" class="text-muted text-center py-2">
                  No teams found matching "{{ searchQuery }}"
                </div>
                
                <div v-else class="list-group">
                  <button 
                    v-for="team in searchResults" 
                    :key="team.id" 
                    type="button"
                    class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                    :class="{ 
                      'active': formData.teamId === team.id,
                      'disabled': isUserTeamMember(team.id)
                    }"
                    @click="selectTeam(team)"
                    :disabled="isUserTeamMember(team.id)"
                  >
                    <div class="d-flex align-items-center">
                      <div class="bg-primary team-avatar me-2">
                        <span class="text-white">{{ getTeamInitials(team.name) }}</span>
                      </div>
                      <div>
                        <div class="fw-semibold">{{ team.name }}</div>
                        <small class="text-muted">
                          Team ID: {{ team.id }}
                          <span v-if="team.book_count !== undefined"> • {{ team.book_count }} book{{ team.book_count !== 1 ? 's' : '' }}</span>
                        </small>
                      </div>
                    </div>
                    <div class="d-flex gap-2">
                      <span v-if="team.deleted_at" class="badge bg-danger">Deleted</span>
                      <span v-if="isUserTeamMember(team.id)" class="badge bg-info">
                        Already Member ({{ getUserTeamRole(team.id) }})
                      </span>
                    </div>
                  </button>
                </div>
              </div>
              
              <!-- Selected Team Display -->
              <div v-if="selectedTeam" class="mt-3 p-3 bg-light rounded">
                <div class="d-flex justify-content-between align-items-center">
                  <div class="d-flex align-items-center">
                    <div class="bg-primary team-avatar me-2">
                      <span class="text-white">{{ getTeamInitials(selectedTeam.name) }}</span>
                    </div>
                    <div>
                      <div class="fw-semibold">{{ selectedTeam.name }}</div>
                      <small class="text-muted">
                        Team ID: {{ selectedTeam.id }}
                        <span v-if="selectedTeam.book_count !== undefined"> • {{ selectedTeam.book_count }} book{{ selectedTeam.book_count !== 1 ? 's' : '' }}</span>
                      </small>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    class="btn btn-sm btn-outline-secondary"
                    @click="clearSelection"
                  >
                    <i class="bi bi-x"></i>
                  </button>
                </div>
              </div>
            </div>
            
            <!-- Role Selection -->
            <div class="form-floating mb-3">
              <select class="form-select" id="selectedTeamRole" v-model="formData.role" required>
                <option value="admin">Admin</option>
                <option value="collaborator">Collaborator</option>
                <option value="viewer">Viewer</option>
              </select>
              <label for="selectedTeamRole">Role</label>
              <div class="form-text">
                <strong>Admin:</strong> Can manage team settings and members<br>
                <strong>Collaborator:</strong> Can edit books and transactions<br>
                <strong>Viewer:</strong> Can only view team content
              </div>
            </div>

            <!-- Submit Buttons -->
            <div class="d-flex justify-content-end gap-2">
              <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
                Cancel
              </button>
              <button type="submit" class="btn btn-primary" :disabled="isSubmitting || !selectedTeam">
                <span v-if="isSubmitting" class="spinner-border spinner-border-sm me-2" role="status"></span>
                Add to Team
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useTeamsStore } from '../../../stores/teams'
import { useToast } from '../../../composables/useToast'

const props = defineProps({
  username: {
    type: String,
    required: true
  },
  userId: {
    type: Number,
    required: true
  },
  userTeams: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['added'])

const teamsStore = useTeamsStore()
const { showToast } = useToast()

// State
const formData = ref({
  teamId: '',
  role: 'viewer'
})
const isSubmitting = ref(false)
const modalInstance = ref(null)
const searchQuery = ref('')
const searchResults = ref([])
const isSearching = ref(false)
const searchTimeout = ref(null)
const selectedTeam = ref(null)

// Initialize Bootstrap modal
onMounted(() => {
  nextTick(() => {
    // Import Bootstrap's Modal class
    import('bootstrap').then(bootstrap => {
      // Initialize the modal
      const modalEl = document.getElementById('addTeamModal')
      if (modalEl) {
        modalInstance.value = new bootstrap.Modal(modalEl)
        
        // Reset form when modal is hidden
        modalEl.addEventListener('hidden.bs.modal', () => {
          formData.value = {
            teamId: '',
            role: 'viewer'
          }
          selectedTeam.value = null
          searchQuery.value = ''
          searchResults.value = []
        })
      }
    })
  })
})

// Helper functions
function getTeamInitials(teamName) {
  if (!teamName) return '?'
  return teamName
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

function isUserTeamMember(teamId) {
  return props.userTeams.some(team => team.id === teamId)
}

function getUserTeamRole(teamId) {
  const userTeam = props.userTeams.find(team => team.id === teamId)
  return userTeam ? userTeam.role : null
}

function handleSearchInput() {
  // Clear previous timeout
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }
  
  // Debounce search
  searchTimeout.value = setTimeout(() => {
    performSearch()
  }, 300)
}

async function performSearch() {
  const query = searchQuery.value.trim()
  
  if (query.length < 1) {
    searchResults.value = []
    return
  }
  
  isSearching.value = true
  
  try {
    // Filter teams based on search query
    const results = teamsStore.teams.filter(team => 
      team.name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 10) // Limit to 10 results
    
    searchResults.value = results
  } catch (error) {
    console.error('Error searching teams:', error)
    showToast({
      title: 'Error',
      message: 'Failed to search teams',
      variant: 'danger'
    })
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
}

function selectTeam(team) {
  // Prevent selecting teams where user is already a member
  if (isUserTeamMember(team.id)) {
    showToast({
      title: 'User Already Member',
      message: `${props.username} is already a member of team "${team.name}" with role: ${getUserTeamRole(team.id)}`,
      variant: 'info'
    })
    return
  }
  
  selectedTeam.value = team
  formData.value.teamId = team.id
  searchQuery.value = ''
  searchResults.value = []
}

function clearSelection() {
  selectedTeam.value = null
  formData.value.teamId = ''
}

async function handleSubmit() {
  if (!formData.value.teamId || !formData.value.role) {
    return
  }
  
  isSubmitting.value = true
  
  try {
    await teamsStore.addUserToTeam(
      formData.value.teamId,
      props.userId,
      formData.value.role
    )
    
    // Emit success event
    emit('added')
    
    // Close the modal using Bootstrap
    if (modalInstance.value) {
      modalInstance.value.hide()
    }
  } catch (error) {
    // Re-throw error to be handled by parent
    throw error
  } finally {
    isSubmitting.value = false
  }
}

// Expose methods for parent component
defineExpose({
  show: () => {
    if (modalInstance.value) {
      modalInstance.value.show()
    }
  },
  hide: () => {
    if (modalInstance.value) {
      modalInstance.value.hide()
    }
  }
})
</script>

<style scoped>
.team-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  flex-shrink: 0;
}

.list-group-item.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.list-group-item.disabled:hover {
  background-color: var(--bs-list-group-bg);
}
</style>
