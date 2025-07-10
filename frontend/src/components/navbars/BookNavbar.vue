<template>
  <!-- Book-specific navbar -->
  <nav class="navbar navbar-expand-lg bg-body-secondary p-3 book-navbar">
    <div class="container-fluid">
      <!-- Back to books button -->
      <div class="navbar-brand">
        <RouterLink class="btn btn-outline-primary" to="/books" title="Back to all books">
          <i class="bi bi-chevron-left"></i>
        </RouterLink>
      </div>

      <!-- Brand logo and book name -->
      <div class="d-flex justify-content-left align-items-center me-2">
        <RouterLink class="me-2" to="/books">
          <img src="/logo/logo_128.png" alt="Tomás - Purrfect Budgets" class="navbar-logo">
        </RouterLink>
  
        <span v-if="book" class="fw-bold fs-4">
          {{ book.name }}
        </span>
      </div>

      <!-- Mobile toggle button -->
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav"
        aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>

      <!-- Navigation content -->
      <div class="collapse navbar-collapse flex-grow-1" id="navbarNav">
        <!-- Left-aligned tab navigation -->
        <div class="navbar-nav flex-grow-1">
          <div v-if="book" class="nav-tabs-container">
            <ul class="nav nav-tabs border-0">
              <li class="nav-item">
                <RouterLink 
                  class="nav-link" 
                  active-class="active"
                  :to="{ path: '/calendar', query: { bookId: book.id } }">
                  <i class="bi bi-calendar-week me-1"></i>
                  Calendar
                </RouterLink>
              </li>
              <li class="nav-item">
                <RouterLink 
                  class="nav-link" 
                  active-class="active"
                  :to="{ path: '/transactions', query: { bookId: book.id } }">
                  <i class="bi bi-list-columns-reverse me-1"></i>
                  Transactions
                </RouterLink>
              </li>
            </ul>
          </div>
        </div>

        <!-- Right-aligned nav items -->
        <ul class="navbar-nav">
          <!-- Book management tools group -->
          <li v-if="book" class="nav-item me-2">
            <div class="btn-group" role="group" aria-label="Book management tools">
              <button class="btn btn-link" @click="openCategoriesModal" title="Manage Categories">
                <i class="bi bi-tags"></i>
              </button>
              <button class="btn btn-link" @click="openBookSettings" title="Book Settings">
                <i class="bi bi-book"></i>
              </button>
            </div>
          </li>

          <!-- App settings tools group -->
          <li class="nav-item me-2">
            <div class="btn-group" role="group" aria-label="App settings">
              <button class="btn btn-link" @click="toggleDarkMode" 
                      :title="isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'"
                      :aria-label="isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'">
                <i class="bi" :class="isDarkMode ? 'bi-sun' : 'bi-moon'"></i>
              </button>
            </div>
          </li>

          <!-- User menu -->
          <UserMenu :bookRole="userRole" />
        </ul>
      </div>
    </div>
  </nav>

  <!-- Book settings modal -->
  <BookModal v-model="showBookModal" :book="bookToEdit" :isLoading="booksStore.isLoading"
    @save="handleSaveBook" />

  <!-- Categories management modal -->
  <CategoriesModal v-model="showCategoriesModal" :book="book" />
</template>

<script setup>
/**
 * BookNavbar Component
 * 
 * Navigation bar for book-scoped pages that provides book context,
 * navigation, and user controls with responsive design.
 * 
 * Props:
 * @prop {Object} book - Current book object with id, name, etc.
 */

import { ref, computed, watch, onMounted } from 'vue'
import UserMenu from '../UserMenu.vue'
import BookModal from '../modals/BookModal.vue'
import CategoriesModal from '../modals/CategoriesModal.vue'
import { useBooksStore } from '../../stores/books'
import { useUsersStore } from '../../stores/users'
import { useTeamsStore } from '../../stores/teams'
import { useToast } from '../../composables/useToast'

const props = defineProps({
  book: Object
})

// Store reference for book operations
const booksStore = useBooksStore()
const usersStore = useUsersStore()
const teamsStore = useTeamsStore()
const { showToast } = useToast()

// Computed property to get the user's role in the current book
const userRole = computed(() => {
  if (!props.book) {
    console.log('No book available');
    return null;
  }

  const currentUser = usersStore.currentUser;
  if (!currentUser) {
    console.log('No current user');
    return null;
  }

  // Check if currentTeamUsers is available
  const users = teamsStore.currentTeamUsers;
  if (!users || !Array.isArray(users) || users.length === 0) {
    console.log('currentTeamUsers not available or empty:', users);
    return null;
  }

  // Find the user's role in the current team
  const userEntry = users.find(
    entry => entry.id === currentUser.id
  );

  return userEntry?.role || null;
})

// Get a friendly display name and badge color for the role
const roleDisplay = computed(() => {
  switch (userRole.value) {
    case 'admin':
      return { name: 'Admin', class: 'bg-danger' };
    case 'collaborator':
      return { name: 'Collaborator', class: 'bg-success' };
    case 'viewer':
      return { name: 'Viewer', class: 'bg-info' };
    default:
      return { name: 'Unknown', class: 'bg-secondary' };
  }
})

// Component state
const showBookModal = ref(false)
const bookToEdit = ref(null)
const showCategoriesModal = ref(false)
const isDarkMode = ref(false)

// Dark mode toggle functionality
function toggleDarkMode() {
  isDarkMode.value = !isDarkMode.value

  if (isDarkMode.value) {
    document.documentElement.setAttribute('data-bs-theme', 'dark')
  } else {
    document.documentElement.setAttribute('data-bs-theme', 'light')
  }

  localStorage.setItem('darkMode', isDarkMode.value ? 'true' : 'false')
}

// Initialize dark mode state
function initializeDarkMode() {
  const savedDarkMode = localStorage.getItem('darkMode')

  if (savedDarkMode === 'true') {
    isDarkMode.value = true
    document.documentElement.setAttribute('data-bs-theme', 'dark')
  } else if (savedDarkMode === 'false') {
    isDarkMode.value = false
    document.documentElement.setAttribute('data-bs-theme', 'light')
  } else if (savedDarkMode === null) {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    isDarkMode.value = prefersDark

    if (prefersDark) {
      document.documentElement.setAttribute('data-bs-theme', 'dark')
    } else {
      document.documentElement.setAttribute('data-bs-theme', 'light')
    }
  }
}

// Load team users for the current book
async function loadTeamUsers() {
  if (!props.book) {
    console.log('No book to load users for');
    return;
  }

  try {
    await teamsStore.fetchTeamUsers(props.book.team_id);
  } catch (error) {
    console.error('Error loading team users:', error);
  }
}

function openBookSettings() {
  if (props.book) {
    bookToEdit.value = props.book
    showBookModal.value = true
  }
}

function openCategoriesModal() {
  if (props.book) {
    showCategoriesModal.value = true
  }
}

async function handleSaveBook(bookData) {
  try {
    await booksStore.saveBook(bookData)
    showBookModal.value = false

    showToast({
      title: 'Success',
      message: 'Book updated successfully!',
      variant: 'success'
    })
  } catch (error) {
    console.error('Error updating book:', error)

    showToast({
      title: 'Error',
      message: `Error updating book: ${error.message}`,
      variant: 'danger'
    })
  }
}

// Load book users when component is mounted
onMounted(() => {
  
  // Initialize dark mode
  initializeDarkMode();
  
  // Load team users if book is available
  if (props.book) {
    loadTeamUsers();
  }
})

// Watch for changes in the book prop
watch(() => props.book, async (newBook) => {
  if (newBook) {
    await loadTeamUsers();
  }
}, { immediate: true })
</script>
