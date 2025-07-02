<template>
  <AdminLayout>
    <div class="container-fluid py-4">
      <div class="row">
        <div class="col-12">
          <!-- Page Header -->
          <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 class="mb-0">
                <i class="bi bi-person me-2"></i>
                {{ isNew ? 'Create User' : 'Edit User' }}
              </h1>
              <nav aria-label="breadcrumb">
                <ol class="breadcrumb">
                  <li class="breadcrumb-item">
                    <RouterLink to="/admin">Admin</RouterLink>
                  </li>
                  <li class="breadcrumb-item">
                    <RouterLink to="/admin/users">Users</RouterLink>
                  </li>
                  <li class="breadcrumb-item active" aria-current="page">
                    {{ isNew ? 'Create User' : 'Edit User' }}
                  </li>
                </ol>
              </nav>
            </div>
            <div>
              <RouterLink to="/admin/users" class="btn btn-outline-secondary me-2">
                <i class="bi bi-arrow-left me-1"></i>
                Back to Users
              </RouterLink>
            </div>
          </div>

          <!-- User Form Card -->
          <div class="card">
            <div class="card-body">
              <div v-if="isLoading" class="text-center py-5">
                <div class="spinner-border" role="status">
                  <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2 text-muted">Loading user data...</p>
              </div>
              
              <div v-else-if="error" class="alert alert-danger">
                <i class="bi bi-exclamation-triangle me-2"></i>
                {{ error }}
              </div>
              
              <form v-else @submit.prevent="saveUser">
                <!-- User Info Section -->
                <div class="row mb-4">
                  <div class="col-md-6">
                    <!-- Username Field -->
                    <div class="form-floating mb-3">
                      <input 
                        type="text" 
                        class="form-control" 
                        id="username" 
                        v-model="userData.username"
                        placeholder="Username"
                        :disabled="!isNew"
                        required
                      >
                      <label for="username">Username</label>
                      <small class="form-text text-muted" v-if="!isNew">
                        Username cannot be changed after creation.
                      </small>
                    </div>
                  </div>
                  
                  <div class="col-md-6">
                    <!-- Full Name Field -->
                    <div class="form-floating mb-3">
                      <input 
                        type="text" 
                        class="form-control" 
                        id="fullName" 
                        v-model="userData.fullname"
                        placeholder="Full Name"
                        required
                      >
                      <label for="fullName">Full Name</label>
                    </div>
                  </div>
                </div>
                
                <div class="row mb-4">
                  <div class="col-md-6">
                    <!-- Password Field -->
                    <div class="form-floating mb-3">
                      <input 
                        type="password" 
                        class="form-control" 
                        id="password" 
                        v-model="userData.password"
                        placeholder="Password"
                        :required="isNew"
                      >
                      <label for="password">{{ isNew ? 'Password' : 'New Password (leave blank to keep current)' }}</label>
                    </div>
                  </div>
                </div>
                
                <!-- User Role & Status -->
                <div class="row mb-4">
                  <div class="col-md-6">
                    <!-- Super Admin Toggle -->
                    <div class="form-check form-switch mb-3">
                      <input 
                        class="form-check-input" 
                        type="checkbox" 
                        id="superadmin" 
                        v-model="userData.superadmin"
                      >
                      <label class="form-check-label" for="superadmin">
                        Super Administrator
                      </label>
                      <div class="form-text">
                        Super admins have full access to the admin dashboard and all system settings.
                      </div>
                    </div>
                  </div>
                  
                  <div class="col-md-6">
                    <!-- User Status -->
                    <div class="form-check form-switch mb-3">
                      <input 
                        class="form-check-input" 
                        type="checkbox" 
                        id="active" 
                        v-model="userData.active"
                      >
                      <label class="form-check-label" for="active">
                        Account Active
                      </label>
                      <div class="form-text">
                        Inactive accounts cannot log in to the system.
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- Submit Buttons -->
                <div class="d-flex justify-content-between">
                  <RouterLink to="/admin/users" class="btn btn-outline-secondary">
                    Cancel
                  </RouterLink>
                  
                  <div>
                    <button 
                      type="submit" 
                      class="btn btn-primary"
                      :disabled="isSaving"
                    >
                      <span v-if="isSaving" class="spinner-border spinner-border-sm me-2"></span>
                      {{ isNew ? 'Create User' : 'Save Changes' }}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUsersStore } from '../../stores/users'
import { useToast } from '../../composables/useToast'
import AdminLayout from '../../layouts/AdminLayout.vue'

const route = useRoute()
const router = useRouter()
const usersStore = useUsersStore()
const { showToast } = useToast()

// State
const userData = ref({
  username: '',
  fullname: '',
  password: '',
  superadmin: false,
  active: true
})
const isLoading = ref(false)
const isSaving = ref(false)
const error = ref(null)

// Computed
const userId = computed(() => route.params.id ? parseInt(route.params.id) : null)
const isNew = computed(() => !userId.value)

// Load user data if editing existing user
onMounted(async () => {
  if (userId.value) {
    await loadUserData()
  }
})

async function loadUserData() {
  isLoading.value = true
  error.value = null
  
  try {
    const user = await usersStore.fetchUserById(userId.value)
    
    userData.value = {
      username: user.username || '',
      fullname: user.fullname || '',
      password: '', // Leave password empty when editing
      superadmin: user.superadmin || false,
      active: user.active !== false // Default to true if not specified
    }
  } catch (err) {
    console.error('Error loading user:', err)
    error.value = `Failed to load user: ${err.message}`
  } finally {
    isLoading.value = false
  }
}

async function saveUser() {
  isSaving.value = true
  error.value = null
  
  try {
    // Create data object, omitting password if it's empty on edit
    const dataToSave = { ...userData.value }
    
    // Only include password if it's provided or if creating a new user
    if (!isNew.value && !dataToSave.password) {
      delete dataToSave.password
    }
    
    if (isNew.value) {
      await usersStore.createUser(dataToSave)
      showToast({
        title: 'Success',
        message: 'User created successfully',
        variant: 'success'
      })
    } else {
      await usersStore.updateUser(userId.value, dataToSave)
      showToast({
        title: 'Success',
        message: 'User updated successfully',
        variant: 'success'
      })
    }
    
    // Navigate back to users list
    router.push('/admin/users')
  } catch (err) {
    console.error('Error saving user:', err)
    error.value = `Failed to save user: ${err.message}`
    showToast({
      title: 'Error',
      message: `Failed to save user: ${err.message}`,
      variant: 'danger'
    })
  } finally {
    isSaving.value = false
  }
}
</script>
