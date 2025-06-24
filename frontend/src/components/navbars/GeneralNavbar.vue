<template>
  <nav class="navbar navbar-expand-lg bg-body-secondary p-3">
    <div class="container-fluid">
      <RouterLink class="navbar-brand fw-bold fs-4 d-flex align-items-center" to="/workspaces">
        <img src="/logo/logotype_512.png" alt="Tomás - Purrfect Budgets" class="navbar-logo me-2">
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
import { useUsersStore } from '../../stores/users'
import UserMenu from '../UserMenu.vue'
import DarkModeToggle from '../DarkModeToggle.vue'

const usersStore = useUsersStore()
</script>
