<template>
  <div class="container-fluid d-flex justify-content-center align-items-center min-vh-100">
    <div class="text-center">
      <div class="mb-4">
        <h1 class="display-1 fw-bold text-primary">404</h1>
        <h2 class="h4 mb-3">{{ pageTitle }}</h2>
        <p class="lead mb-4">
          {{ pageDescription }}
        </p>
      </div>
      
      <div class="d-flex flex-column flex-sm-row gap-3 justify-content-center">
        <router-link 
          to="/books" 
          class="btn btn-primary btn-lg"
        >
          <i class="bi bi-house-door me-2"></i>
          Go to Books
        </router-link>
        
        <button 
          @click="goBack" 
          class="btn btn-outline-secondary btn-lg"
        >
          <i class="bi bi-arrow-left me-2"></i>
          Go Back
        </button>
      </div>
      
      <div class="mt-5">
        <p class="text-muted small">
          If you believe this is an error, please contact support.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const pageTitle = computed(() => {
  const fromPath = route.query.from || ''
  if (fromPath.includes('/calendar')) {
    return 'Book Not Found'
  }
  return 'Page Not Found'
})

const pageDescription = computed(() => {
  const fromPath = route.query.from || ''
  if (fromPath.includes('/calendar')) {
    return 'The book you\'re looking for doesn\'t exist or you don\'t have access to it.'
  }
  return 'The page you\'re looking for doesn\'t exist or you don\'t have access to it.'
})

const goBack = () => {
  if (window.history.length > 1) {
    router.go(-1)
  } else {
    router.push('/books')
  }
}
</script>

<style scoped>
.min-vh-100 {
  min-height: 100vh;
}
</style>
