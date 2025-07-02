<template>
  <div class="login-container" data-bs-theme="light">
    <div class="card login-card">
      <div class="card-body p-4">
        <!-- Logo and Title -->
        <div class="text-center">
          <img src="/logo/logotype_512.png" alt="Tomás Logo" class="login-logo">
        </div>

        <!-- Login Form (only show if not authenticated or needs login) -->
        <div v-if="!usersStore.isAuthenticated">
          <form @submit.prevent="handleLogin">
            <div class="form-floating mb-3">
              <input type="text" class="form-control" id="username" v-model="username" placeholder="Username" required>
              <label for="username">Username</label>
            </div>

            <div class="form-floating mb-3">
              <input type="password" class="form-control" id="password" v-model="password" placeholder="Password"
                required>
              <label for="password">Password</label>
            </div>

            <button type="submit" class="btn btn-primary w-100" :disabled="isLoading">
              <span v-if="isLoading" class="spinner-border spinner-border-sm me-2"></span>
              Sign In
            </button>
          </form>

          <!-- Error Message -->
          <div v-if="error" class="alert alert-danger mt-3" role="alert">
            {{ error }}
          </div>
        </div>

        <!-- Team Selection Message (when authenticated but no team selected) -->
        <div v-else-if="usersStore.isAuthenticated && !usersStore.hasSelectedTeam" class="text-center">
          <div v-if="showNoTeamsMessage" class="alert alert-warning">
            <i class="bi bi-exclamation-triangle me-2"></i>
            <strong>No teams assigned</strong><br>
            Please contact an administrator to be added to a team.
            <div class="mt-3">
              <button @click="handleLogout()" class="btn btn-outline-secondary btn-sm">
                <i class="bi bi-box-arrow-right me-1"></i>
                Sign Out
              </button>
            </div>
          </div>
          <div v-else-if="isLoading" class="text-center">
            <div class="spinner-border" role="status">
              <span class="visually-hidden">Loading teams...</span>
            </div>
            <p class="mt-2 text-muted">Loading your teams...</p>
          </div>
          <div v-else class="alert alert-info">
            <i class="bi bi-people me-2"></i>
            Please select a team to continue
            <div class="mt-3">
              <button @click="openTeamModal" class="btn btn-primary btn-sm">
                <i class="bi bi-people me-1"></i>
                Select Team
              </button>
            </div>
          </div>
        </div>

        <!-- Redirecting message (when authenticated and has team) -->
        <div v-else class="text-center">
          <div class="spinner-border" role="status">
            <span class="visually-hidden">Redirecting...</span>
          </div>
          <p class="mt-2 text-muted">Redirecting to dashboard...</p>
        </div>
      </div>

      <!-- Version Footer -->
      <div class="card-footer bg-body-secondary text-center py-2">
        <small class="text-muted">
          Version {{ version }}
        </small>
      </div>
    </div>

    <!-- Team Selection Modal -->
    <TeamSelectionModal 
      ref="teamModal"
      :is-required="true"
      :auto-show="showTeamModal"
      @team-selected="onTeamSelected"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUsersStore } from '../stores/users'
import TeamSelectionModal from '../components/TeamSelectionModal.vue'

const router = useRouter()
const usersStore = useUsersStore()

const username = ref('')
const password = ref('')
const error = ref('')
const isLoading = ref(false)
const version = ref('0.2.1') // Update this manually when needed
const teamModal = ref(null)
const showNoTeamsMessage = ref(false)
const showTeamModal = ref(false)

// Store original theme to restore it later
let originalTheme = null

onMounted(async () => {
  // Store the current theme
  originalTheme = document.documentElement.getAttribute('data-bs-theme')
  // Force light theme for login page
  document.documentElement.setAttribute('data-bs-theme', 'light')

  // Check if user is already authenticated but needs to select a team
  if (usersStore.isAuthenticated) {
    console.log("User is authenticated, isSuperAdmin:", usersStore.isSuperAdmin);
    
    // Check if user is superadmin first
    if (usersStore.isSuperAdmin) {
      console.log("Redirecting superadmin to admin page");
      await router.push('/admin');
      return;
    }
    
    // Not a superadmin, handle team selection if needed
    if (!usersStore.hasSelectedTeam) {
      try {
        isLoading.value = true
        const teams = await usersStore.fetchUserTeams()
        if (teams.length > 1) {
          // Multiple teams - show selection modal
          showTeamModal.value = true
          teamModal.value?.show()
        } else if (teams.length === 1) {
          // Only one team - auto-select it
          await usersStore.selectTeam(teams[0].id)
          router.push('/books')
        } else {
          // No teams - show contact administrator message
          showNoTeamsMessage.value = true
        }
      } catch (err) {
        console.warn('Could not fetch teams:', err)
        // If fetching teams fails, logout and show login form
        usersStore.logout()
      } finally {
        isLoading.value = false
      }
    } else {
      // Already authenticated and has team selected - redirect to books
      router.push('/books')
    }
  }
})

onUnmounted(() => {
  // Restore original theme when leaving login page
  if (originalTheme) {
    document.documentElement.setAttribute('data-bs-theme', originalTheme)
  } else {
    document.documentElement.removeAttribute('data-bs-theme')
  }
})

async function handleLogin() {
  try {
    isLoading.value = true
    error.value = ''

    await usersStore.login(username.value, password.value)
    
    // Direct check of superadmin status for debugging
    const isSuperAdminDirect = usersStore.currentUser?.superadmin === true;
    console.log("Login successful, user:", usersStore.currentUser);
    console.log("isSuperAdmin getter:", usersStore.isSuperAdmin);
    console.log("isSuperAdmin direct check:", isSuperAdminDirect);
    
    // Check if user is superadmin first
    if (usersStore.isSuperAdmin || isSuperAdminDirect) {
      console.log("Redirecting superadmin to admin page");
      await router.push('/admin');
      return;
    }
    
    // Check if user has teams
    try {
      const teams = await usersStore.fetchUserTeams()
      if (teams.length > 1) {
        // Multiple teams - show selection modal
        showTeamModal.value = true
        teamModal.value?.show()
      } else if (teams.length === 1) {
        // Only one team - auto-select it
        await usersStore.selectTeam(teams[0].id)
        router.push('/books')
      } else {
        // No teams - show contact administrator message
        showNoTeamsMessage.value = true
      }
    } catch (err) {
      // If fetching teams fails, just go to books
      console.warn('Could not fetch teams:', err)
      router.push('/books')
    }
  } catch (err) {
    error.value = err.message || 'Login failed'
  } finally {
    isLoading.value = false
  }
}

function onTeamSelected() {
  // The modal will handle navigation to /books
  // We just need to clear any loading states here
  isLoading.value = false
}

function openTeamModal() {
  teamModal.value?.show()
}

function handleLogout() {
  showNoTeamsMessage.value = false
  usersStore.logout()
}
</script>