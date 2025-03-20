<template>
  <nav class="navbar navbar-expand-lg"
    :class="{ 'navbar-dark bg-dark': isDarkMode, 'navbar-dark bg-primary': !isDarkMode }">
    <div class="container-fluid">
      <RouterLink class="navbar-brand" to="/workspaces">YAMO</RouterLink>

      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
        <span class="navbar-toggler-icon"></span>
      </button>

      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav me-auto">
          <li class="nav-item">
            <RouterLink class="nav-link" active-class="active" to="/workspaces">Workspaces</RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink class="nav-link" active-class="active" to="/calendar">Calendar</RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink class="nav-link" active-class="active" to="/flow">Flow</RouterLink>
          </li>
        </ul>
        <ul class="navbar-nav">
          <li class="nav-item me-2">
            <button class="btn btn-link nav-link" @click="toggleDarkMode" title="Toggle dark mode">
              <i class="bi" :class="isDarkMode ? 'bi-sun' : 'bi-moon'"></i>
            </button>
          </li>
          <li class="nav-item">
            <a href="#" class="nav-link" @click.prevent="handleLogout">
              <i class="bi bi-box-arrow-right"></i> Logout
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
</style>