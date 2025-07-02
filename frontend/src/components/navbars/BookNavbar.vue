<template>
  <!-- Book-specific navbar -->
  <nav class="navbar navbar-expand-lg bg-body-secondary p-3">
    <div class="container-fluid">
      <!-- Brand logo with link to books -->
       <div class="d-flex justify-content-center align-items-center">
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
      <div class="collapse navbar-collapse" id="navbarNav">
        <!-- Left-aligned nav items -->
        <ul class="navbar-nav me-auto d-flex justify-content-end ">
          <li class="nav-item  mr-2">
            <!-- Calendar link -->
            <RouterLink v-if="book" class="nav-link link-body-emphasis" active-class="active"
              :to="{ path: '/calendar', query: { bookId: book.id } }">
              <i class="bi bi-calendar-week me-1"></i>
              Calendar
            </RouterLink>
          </li>

          <li class="nav-item ">
            <!-- Categories button -->
            <button v-if="book" class="btn btn-link nav-link link-body-emphasis" @click="openCategoriesModal">
              <i class="bi bi-tags me-1"></i>
              Categories
            </button>
          </li>
          <li class="nav-item ">
           <RouterLink v-if="book" class="nav-link link-body-emphasis" active-class="active"
              :to="{ path: '/transactions', query: { bookId: book.id } }">
              <i class="bi bi-list-columns-reverse"></i>
              Transactions
            </RouterLink>
          </li>
        </ul>

        <!-- Right-aligned nav items -->
        <ul class="navbar-nav">
          <!-- Book settings button -->
          <li v-if="book" class="nav-item me-2">
            <button class="btn btn-link nav-link" title="Book settings" @click="openBookSettings">
              <i class="bi bi-gear"></i>
            </button>
          </li>

          <!-- Dark mode toggle -->
          <DarkModeToggle />

          <!-- Back to books link -->
          <li v-if="book" class="nav-item me-2">
            <RouterLink class="nav-link" to="/books" title="Back to books">
              <i class="bi bi-grid-3x3-gap me-1"></i>
              Books
            </RouterLink>
          </li>

          <!-- User menu with book role -->
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
import DarkModeToggle from '../DarkModeToggle.vue'
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
