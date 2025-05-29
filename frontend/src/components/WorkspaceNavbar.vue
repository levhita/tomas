<template>
  <nav class="navbar navbar-expand-lg"
    :class="{ 'navbar-dark bg-dark': isDarkMode, 'navbar-dark bg-primary': !isDarkMode }">
    <div class="container-fluid">
      <RouterLink class="navbar-brand" to="/workspaces">YAMO</RouterLink>

      <!-- Workspace display -->
      <div v-if="workspace" class="workspace-display me-auto ms-3">
        <span class="workspace-name">
          <i class="bi bi-building me-1"></i>
          {{ workspace.name }}
        </span>
      </div>

      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav"
        aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>

      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav me-auto">
          <li class="nav-item">
            <RouterLink v-if="workspace" class="nav-link" active-class="active"
              :to="{ path: '/calendar', query: { workspaceId: workspace.id } }">
              <i class="bi bi-calendar-week me-1"></i>
              Calendar
            </RouterLink>
          </li>
          <!-- Additional workspace-specific navigation items can be added here -->
        </ul>

        <ul class="navbar-nav">
          <!-- Workspace settings button -->
          <li v-if="workspace" class="nav-item me-2">
            <button class="btn btn-link nav-link" title="Workspace settings">
              <i class="bi bi-gear"></i>
            </button>
          </li>

          <!-- Dark mode toggle -->
          <li class="nav-item me-2">
            <button class="btn btn-link nav-link" @click="toggleDarkMode" title="Toggle dark mode">
              <i class="bi" :class="isDarkMode ? 'bi-sun' : 'bi-moon'"></i>
            </button>
          </li>

          <!-- Back to workspaces -->
          <li v-if="workspace" class="nav-item me-2">
            <RouterLink class="nav-link" to="/workspaces" title="Back to workspaces">
              <i class="bi bi-grid-3x3-gap me-1"></i>
              Workspaces
            </RouterLink>
          </li>

          <!-- Logout -->
          <li class="nav-item">
            <a href="#" class="nav-link" @click.prevent="handleLogout">
              <i class="bi bi-box-arrow-right me-1"></i>
              Logout
            </a>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUsersStore } from '../stores/users'

const props = defineProps({
  workspace: Object // Changed from workspaceName to workspace
})

const router = useRouter()
const usersStore = useUsersStore()
const isDarkMode = ref(false)

function toggleDarkMode() {
  isDarkMode.value = !isDarkMode.value

  if (isDarkMode.value) {
    document.documentElement.setAttribute('data-bs-theme', 'dark')
  } else {
    document.documentElement.setAttribute('data-bs-theme', 'light')
  }

  localStorage.setItem('darkMode', isDarkMode.value ? 'true' : 'false')
}

onMounted(() => {
  // Check for saved preference
  const savedDarkMode = localStorage.getItem('darkMode')

  if (savedDarkMode === 'true') {
    isDarkMode.value = true
    document.documentElement.setAttribute('data-bs-theme', 'dark')
  } else if (savedDarkMode === null) {
    // If no saved preference, check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    isDarkMode.value = prefersDark

    if (prefersDark) {
      document.documentElement.setAttribute('data-bs-theme', 'dark')
    }
  }
})

async function handleLogout() {
  await usersStore.logout()
  router.push('/login')
}
</script>

<style scoped>
nav {
  padding: 1rem;
}

.workspace-display {
  padding: 0.375rem 0.75rem;
  background-color: rgba(255, 255, 255, 0.15);
  border-radius: 0.25rem;
}

.workspace-name {
  color: white;
  font-weight: 500;
  font-size: 1rem;
}
</style>