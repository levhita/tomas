import { createApp } from 'vue'
import { createPinia } from 'pinia'
import "bootstrap/dist/css/bootstrap.min.css"
import "bootstrap"
import 'bootstrap-icons/font/bootstrap-icons.css'
import './style.css'
import App from './App.vue'
import router from './router'

// Create a single Pinia instance
const pinia = createPinia()

// Create a single Vue app instance
const app = createApp(App)

// Use plugins
app.use(pinia)
app.use(router)

// Initialize authentication state before mounting
async function initializeApp() {
  // Import users store after Pinia is set up
  const { useUsersStore } = await import('./stores/users')
  const usersStore = useUsersStore()

  // Try to restore user session from localStorage
  try {
    await usersStore.initializeFromToken()
  } catch (error) {
    console.log('No valid session found')
  }

  // Mount the app after auth initialization
  app.mount('#app')
}

// Start the app
initializeApp()
