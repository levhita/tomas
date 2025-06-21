<template>
  <div class="login-page d-flex align-items-center justify-content-center min-vh-100 bg-dark" data-bs-theme="light">
    <div class="card shadow" style="width: 24rem;">
      <div class="card-body p-4">
        <!-- Logo and Title -->
        <div class="text-center mb-4">
          <img src="/logo/logotype_512.png" alt="Tomás Logo" class="mb-3" style="height: 80px;">
          <p class="text-muted small">Purrfect Budgets</p>
        </div>

        <!-- Login Form -->
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

      <!-- Version Footer -->
      <div class="card-footer bg-body-secondary text-center py-2">
        <small class="text-muted">
          Version {{ version }}
        </small>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUsersStore } from '../stores/users'

const router = useRouter()
const usersStore = useUsersStore()

const username = ref('')
const password = ref('')
const error = ref('')
const isLoading = ref(false)
const version = ref('0.2.1') // Update this manually when needed

// Store original theme to restore it later
let originalTheme = null

onMounted(() => {
  // Store the current theme
  originalTheme = document.documentElement.getAttribute('data-bs-theme')
  // Force light theme for login page
  document.documentElement.setAttribute('data-bs-theme', 'light')
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
    router.push('/workspaces')
  } catch (err) {
    error.value = err.message || 'Login failed'
  } finally {
    isLoading.value = false
  }
}
</script>