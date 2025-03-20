<template>
  <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
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
import { useRouter } from 'vue-router'
import { useUsersStore } from '../stores/users'

const router = useRouter()
const usersStore = useUsersStore()

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