<template>
  <!-- Book-specific navbar -->
  <nav class="navbar navbar-expand-lg bg-body-secondary p-3">
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
import { useToast } from '../../composables/useToast'

const props = defineProps({
  book: Object
})

// Store reference for book operations
const booksStore = useBooksStore()
const usersStore = useUsersStore()
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

  // Check if currentBookUsers is available
  const users = booksStore.currentBookUsers;
  if (!users || !Array.isArray(users) || users.length === 0) {
    console.log('currentBookUsers not available or empty:', users);
    return null;
  }

  console.log('Current book users:', users);
  console.log('Current user ID:', currentUser.id);

  // Find the user's role in the current book
  const userEntry = users.find(
    entry => entry.id === currentUser.id
  );

  console.log('User entry found:', userEntry);

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

// Method to ensure book users are loaded
async function ensureBookUsersLoaded() {
  console.log('Ensuring book users are loaded');

  if (!props.book) {
    console.log('No book to load users for');
    return;
  }

  try {
    // Always load book users to ensure we have the latest data
    console.log('Loading book users for book ID:', props.book.id);
    const users = await booksStore.getBookUsers(props.book.id);
    console.log('Loaded users:', users);

    // Directly set the ref value for proper reactivity
    booksStore.currentBookUsers = users;

    // Force a component update by triggering a no-op state change
    const dummy = ref(0);
    dummy.value++;
  } catch (error) {
    console.error('Error loading book users:', error);
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
  console.log('Component mounted, ensuring book users are loaded');
  
  // Initialize dark mode
  initializeDarkMode();
  
  // Load book users if book is available
  if (props.book) {
    ensureBookUsersLoaded();
  }
})

// Watch for changes in the book prop
watch(() => props.book, async (newBook) => {
  console.log('Book changed:', newBook);
  if (newBook) {
    await ensureBookUsersLoaded();
  }
}, { immediate: true })
</script>

<style scoped>
.navbar-logo {
  height: 40px;
  width: 40px;
}

.nav-tabs-container {
  display: flex;
  align-items: left;
}

.nav-tabs-container .nav-tabs {
  background: none;
  border: none;
}

.nav-tabs-container .nav-link {
  color: var(--bs-body-color);
  border: 1px solid transparent;
  border-radius: var(--bs-border-radius-pill);
  padding: 0.5rem 1rem;
  margin: 0 0.25rem;
  transition: all 0.15s ease-in-out;
}

.nav-tabs-container .nav-link:hover {
  color: var(--bs-primary);
  background-color: var(--bs-gray-100);
}

.nav-tabs-container .nav-link.active {
  color: var(--bs-primary);
  background-color: var(--bs-primary-bg-subtle);
  border-color: var(--bs-primary);
}

/* Dark mode adjustments */
[data-bs-theme="dark"] .nav-tabs-container .nav-link:hover {
  background-color: var(--bs-gray-800);
}

[data-bs-theme="dark"] .nav-tabs-container .nav-link.active {
  background-color: var(--bs-primary-bg-subtle);
}

/* Responsive adjustments */
@media (max-width: 991.98px) {
  .nav-tabs-container {
    margin-top: 1rem;
    justify-content: left;
  }
  
  .nav-tabs-container .nav-tabs {
    flex-direction: column;
    width: 100%;
  }
  
  .nav-tabs-container .nav-item {
    width: 100%;
  }
  
  .nav-tabs-container .nav-link {
    text-align: center;
    margin: 0.25rem 0;
  }

  /* Stack button groups vertically on mobile */
  .navbar-nav {
    flex-direction: column;
    gap: 0.5rem;
  }

  .btn-group {
    justify-content: center;
  }
}
</style>
