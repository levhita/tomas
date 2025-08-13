<template>
  <GeneralLayout>
    <div class="home container">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1>Books</h1>
          <small class="text-muted">Team: {{ usersStore.currentTeam?.name }}</small>
        </div>
        <div>
          <button 
            v-if="usersStore.isCurrentUserAdmin" 
            class="btn btn-secondary me-2" 
            @click="goToTeamManagement">
            <i class="bi bi-people me-2"></i>Manage Team
          </button>
          <button class="btn btn-primary" @click="showNewBookModal">
            <i class="bi bi-plus-circle me-2"></i>New Book
          </button>
        </div>
      </div>

      <div v-if="booksStore.isLoading" class="text-center my-5">
        <div class="spinner-border" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>

      <div v-else-if="booksStore.error" class="alert alert-danger">
        {{ booksStore.error }}
      </div>

      <div v-else-if="teamsStore.currentTeamBooks.length === 0" class="text-center my-5">
        <div class="alert alert-info">
          <i class="bi bi-info-circle me-2"></i>
          No books found. Create your first book to get started.
        </div>
      </div>

      <div v-else class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
        <div v-for="book in teamsStore.booksByName" :key="book.id" class="col">
          <div class="card h-100 book-card">
            <div class="card-body">
              <h5 class="card-title">{{ book.name }}</h5>
              <p class="card-text text-muted small">
                Created {{ formatDate(book.created_at) }}
              </p>
              <p class="card-text" v-if="book.note">{{ book.note }}</p>
              <p class="card-text" v-else><em>No note</em></p>
            </div>
            <div class="card-footer bg-transparent d-flex justify-content-between">
              <button class="btn btn-sm btn-primary" @click="selectBook(book)">
                <i class="bi bi-folder2-open me-1"></i>Open
              </button>
              <div>
                <button class="btn btn-sm btn-outline-secondary me-1" @click="editBook(book)"
                  aria-label="Edit">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" @click="confirmDeleteBook(book)"
                  aria-label="Delete">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Book Modal Component -->
      <BookModal v-model="showBookModal" :book="selectedBook" :isLoading="booksStore.isLoading"
        @save="handleSaveBook" />

      <!-- Delete Confirmation Modal -->
      <div class="modal fade" id="deleteModal" tabindex="-1" ref="deleteModal">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Confirm Delete</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              Are you sure you want to delete the book "{{ bookToDelete?.name }}"?
              This action cannot be undone.
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-danger" @click="deleteBook"
                :disabled="booksStore.isLoading">
                {{ booksStore.isLoading ? 'Deleting...' : 'Delete' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Team Selection Modal -->
      <TeamSelectionModal 
        ref="teamModal"
        @team-selected="onTeamSelected"
      />
    </div>
  </GeneralLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useBooksStore } from '../stores/books';
import { useTeamsStore } from '../stores/teams';
import { useUsersStore } from '../stores/users';
import { useToast } from '../composables/useToast';
import { Modal } from 'bootstrap';
import GeneralLayout from '../layouts/GeneralLayout.vue';
import BookModal from '../components/modals/BookModal.vue';
import TeamSelectionModal from '../components/TeamSelectionModal.vue';

const router = useRouter();
const route = useRoute();
const booksStore = useBooksStore();
const teamsStore = useTeamsStore();
const usersStore = useUsersStore();
const { showToast } = useToast();

// Component state
const showBookModal = ref(false)
const selectedBook = ref(null)
const deleteModal = ref(null);
const bookToDelete = ref(null);
const teamModal = ref(null);

let bsDeleteModal = null;

onMounted(async () => {
  // Initialize bootstrap delete modal
  bsDeleteModal = new Modal(deleteModal.value);

  // Check for error parameters from redirects
  const errorParam = route.query.error;
  if (errorParam) {
    let errorMessage = 'An error occurred';
    
    switch (errorParam) {
      case 'missing-book':
        errorMessage = 'No book was specified. Please select a book to continue.';
        break;
      case 'book-error':
        errorMessage = 'There was an error loading the book. Please try again.';
        break;
      case 'unauthorized-admin':
        errorMessage = 'You do not have permission to access the admin area.';
        break;
      default:
        errorMessage = `An error occurred: ${errorParam}`;
    }
    
    showToast({
      title: 'Access Error',
      message: errorMessage,
      variant: 'warning'
    });
    
    // Clean the URL by removing the error parameter
    router.replace({ 
      name: 'books',
      query: { ...route.query, error: undefined }
    });
  }

  // Check if user has selected a team
  if (!usersStore.hasSelectedTeam) {
    // Redirect to login to handle team selection
    router.push('/login');
    return;
  }

  // Fetch books since team is selected
  try {
    const currentTeam = usersStore.currentTeam;
    if (!currentTeam) {
      throw new Error('No team selected');
    }
    
    await teamsStore.fetchTeamBooks(currentTeam.id);
  } catch (error) {
    console.error('Failed to load books', error);
  }
});

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

function showNewBookModal() {
  selectedBook.value = null
  showBookModal.value = true
}

function editBook(book) {
  selectedBook.value = book
  showBookModal.value = true
}

async function handleSaveBook(bookData) {
  try {
    await booksStore.saveBook(bookData)
    showBookModal.value = false

    showToast({
      title: 'Success',
      message: `Book ${bookData.id ? 'updated' : 'created'} successfully!`,
      variant: 'success'
    })
  } catch (error) {
    showToast({
      title: 'Error',
      message: `Error saving book: ${error.message}`,
      variant: 'danger'
    })
  }
}

function confirmDeleteBook(book) {
  bookToDelete.value = book;
  bsDeleteModal.show();
}

async function deleteBook() {
  if (!bookToDelete.value) return;

  try {
    await booksStore.deleteBook(bookToDelete.value.id);
    bsDeleteModal.hide();

    showToast({
      title: 'Success',
      message: 'Book deleted successfully!',
      variant: 'success'
    })
  } catch (error) {
    showToast({
      title: 'Error',
      message: `Error deleting book: ${error.message}`,
      variant: 'danger'
    })
  }
}

function selectBook(book) {
  router.push({
    path: '/calendar',
    query: {
      bookId: book.id,
    },
    replace: false
  });
}

function showTeamSelection() {
  teamModal.value?.show();
}

async function onTeamSelected() {
  // Reload books for the newly selected team
  try {
    const currentTeam = usersStore.currentTeam;
    if (!currentTeam) {
      throw new Error('No team selected');
    }
    
    await teamsStore.fetchTeamBooks(currentTeam.id);
  } catch (error) {
    console.error('Failed to load books for selected team', error);
  }
}

function goToTeamManagement() {
  router.push('/team');
}
</script>