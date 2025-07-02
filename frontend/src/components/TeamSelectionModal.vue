<template>
  <div class="modal fade" ref="modalElement" tabindex="-1" aria-labelledby="teamSelectionModalLabel" aria-hidden="true" data-bs-backdrop="static" data-bs-keyboard="false">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h1 class="modal-title fs-5" id="teamSelectionModalLabel">
            <i class="bi bi-people-fill me-2"></i>
            Select Team
          </h1>
          <button v-if="!isRequired" type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        
        <div class="modal-body">
          <div v-if="isLoading" class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading teams...</span>
            </div>
            <p class="mt-2 text-muted">Loading your teams...</p>
          </div>

          <div v-else-if="error" class="alert alert-danger" role="alert">
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
            {{ error }}
          </div>

          <div v-else-if="teams.length === 0" class="text-center py-4">
            <i class="bi bi-people text-muted" style="font-size: 3rem;"></i>
            <h5 class="mt-3 text-muted">No Teams Available</h5>
            <p class="text-muted">You don't have access to any teams yet.</p>
          </div>

          <div v-else>
            <p class="text-muted mb-3">Choose a team to work with:</p>
            
            <div class="list-group">
              <button 
                v-for="team in teams" 
                :key="team.id"
                type="button" 
                class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                :class="{ 'active': selectedTeamId === team.id }"
                @click="selectTeam(team)"
                :disabled="isSelecting"
              >
                <div>
                  <h6 class="mb-1">{{ team.name }}</h6>
                  <small class="text-muted">
                    <i class="bi bi-person-badge me-1"></i>
                    {{ formatRole(team.role) }}
                  </small>
                </div>
                
                <div v-if="selectedTeamId === team.id">
                  <i v-if="isSelecting" class="spinner-border spinner-border-sm text-light"></i>
                  <i v-else class="bi bi-check-circle-fill text-success"></i>
                </div>
              </button>
            </div>

            <div v-if="currentTeam" class="mt-3 p-3 bg-body-secondary rounded">
              <small class="text-muted">
                <i class="bi bi-info-circle me-1"></i>
                Currently working with: <strong>{{ currentTeam.name }}</strong> ({{ formatRole(currentTeam.role) }})
              </small>
            </div>
          </div>
        </div>

        <div class="modal-footer" v-if="!isLoading && teams.length > 0">
          <button v-if="!isRequired" type="button" class="btn btn-secondary" data-bs-dismiss="modal">
            Cancel
          </button>
          <button 
            type="button" 
            class="btn btn-primary" 
            @click="confirmSelection"
            :disabled="!selectedTeamId || isSelecting"
          >
            <span v-if="isSelecting" class="spinner-border spinner-border-sm me-2"></span>
            {{ isSelecting ? 'Switching...' : 'Switch Team' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useUsersStore } from '../stores/users'
import { useRouter } from 'vue-router'
import { Modal } from 'bootstrap'

const props = defineProps({
  isRequired: {
    type: Boolean,
    default: false
  },
  autoShow: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['teamSelected', 'cancelled'])

const usersStore = useUsersStore()
const router = useRouter()

const teams = ref([])
const selectedTeamId = ref(null)
const isLoading = ref(false)
const isSelecting = ref(false)
const error = ref('')
const modalElement = ref(null)
const modalInstance = ref(null)

const currentTeam = computed(() => usersStore.currentTeam)

onMounted(async () => {
  // Initialize Bootstrap modal
  if (modalElement.value) {
    modalInstance.value = new Modal(modalElement.value)
  
    // Auto-show if requested
    if (props.autoShow) {
      show()
    }
  
    // Listen for modal events
    modalElement.value.addEventListener('hidden.bs.modal', () => {
      if (!props.isRequired) {
        emit('cancelled')
      }
    })
  }
})

// Watch for changes in user authentication
watch(() => usersStore.isAuthenticated, (isAuth) => {
  if (isAuth) {
    loadTeams()
  }
}, { immediate: true })

async function loadTeams() {
  if (!usersStore.isAuthenticated) return

  try {
    isLoading.value = true
    error.value = ''
    teams.value = await usersStore.fetchUserTeams()
    
    // Auto-select current team if any
    if (currentTeam.value) {
      selectedTeamId.value = currentTeam.value.id
    }
  } catch (err) {
    console.error('Failed to load teams:', err)
    error.value = err.message || 'Failed to load teams'
  } finally {
    isLoading.value = false
  }
}

function selectTeam(team) {
  if (isSelecting.value) return
  selectedTeamId.value = team.id
}

async function confirmSelection() {
  if (!selectedTeamId.value || isSelecting.value) return

  const team = teams.value.find(t => t.id === selectedTeamId.value)
  if (!team) return

  try {
    isSelecting.value = true
    await usersStore.selectTeam(team.id)
    
    emit('teamSelected', team)
    hide()
    
    // Redirect to books if this was required (after login)
    if (props.isRequired) {
      router.push('/books')
    }
  } catch (err) {
    console.error('Failed to select team:', err)
    error.value = err.message || 'Failed to select team'
  } finally {
    isSelecting.value = false
  }
}

function formatRole(role) {
  return role.charAt(0).toUpperCase() + role.slice(1)
}

function show() {
  if (modalInstance.value) {
    loadTeams()
    modalInstance.value.show()
  }
}

function hide() {
  if (modalInstance.value) {
    modalInstance.value.hide()
  }
}

// Expose methods for parent components
defineExpose({
  show,
  hide,
  loadTeams
})
</script>

<style scoped>
.list-group-item:hover:not(.active) {
  background-color: var(--bs-gray-100);
}

.list-group-item.active {
  background-color: var(--bs-primary);
  border-color: var(--bs-primary);
}

.modal-backdrop.show {
  opacity: 0.8;
}
</style>
