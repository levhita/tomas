<template>
  <nav class="navbar navbar-expand-lg bg-body-secondary shadow-sm">
    <div class="container-fluid">
      <RouterLink class="navbar-brand  d-flex align-items-center" to="/workspaces">
        <img src="/logo/logo_128.png" alt="Tomás - Purrfect Budgets" class="navbar-logo me-2">
        Tomás
      </RouterLink>

      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav"
        aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>

      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav me-auto">
          <li class="nav-item">
            <RouterLink class="nav-link" active-class="active" to="/workspaces">
              Workspaces
            </RouterLink>
          </li>
          <!-- Admin section link - only visible for superadmins -->
          <li v-if="usersStore.isSuperAdmin" class="nav-item">
            <RouterLink class="nav-link" active-class="active" to="/admin">
              <i class="bi bi-gear-fill me-1"></i>
              Admin
            </RouterLink>
          </li>
        </ul>

        <ul class="navbar-nav">
          <DarkModeToggle />
          <UserMenu />
        </ul>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { useUsersStore } from '../stores/users'
import UserMenu from './UserMenu.vue'
import DarkModeToggle from './DarkModeToggle.vue'

const usersStore = useUsersStore()
</script>

<style scoped>
nav {
  padding: 1rem;
}

.navbar-brand {
  font-weight: bold;
  font-size: 1.5rem;
}

.navbar-logo {
  height: 64px;
  width: auto;
  margin: -1rem 0;
}
</style>