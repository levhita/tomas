import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import fetchWithAuth from '../utils/fetch';
import { useAccountsStore } from './accounts';
import { useCategoriesStore } from './categories';
import { useTransactionsStore } from './transactions';
import { useUsersStore } from './users';
import { useTeamsStore } from './teams';

export const useBooksStore = defineStore('books', () => {
  // State
  const currentBook = ref(null);
  const isLoading = ref(false);
  const error = ref(null);

  // Getters
  const hasAdminPermission = computed(() => {
    if (!currentBook.value) return false;

    const usersStore = useUsersStore();
    const teamsStore = useTeamsStore();
    const currentUser = usersStore.currentUser;

    // Check if user has admin role in the current team
    const userEntry = teamsStore.currentTeamUsers.find(
      entry => entry.id === currentUser?.id
    );

    return userEntry?.role === 'admin';
  });

  // General write permission - for users who can edit (admin or collaborator)
  // This determines if user can add/edit categories and transactions
  const hasWritePermission = computed(() => {
    if (!currentBook.value) return false;

    const usersStore = useUsersStore();
    const teamsStore = useTeamsStore();
    const currentUser = usersStore.currentUser;

    // Admin in this team has write permissions
    if (hasAdminPermission.value) return true;

    // Check if user exists in the current team
    const userEntry = teamsStore.currentTeamUsers.find(
      entry => entry.id === currentUser?.id
    );

    return userEntry?.role === 'admin' || userEntry?.role === 'collaborator';
  });

  // Actions

  async function fetchBookById(id) {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await fetchWithAuth(`/api/books/${id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch book');
      }

      const book = await response.json();

      // Update in teams store books list if exists
      const teamsStore = useTeamsStore();
      const index = teamsStore.currentTeamBooks.findIndex(w => w.id === parseInt(id));
      if (index !== -1) {
        teamsStore.currentTeamBooks[index] = book;
      } else {
        teamsStore.currentTeamBooks.push(book);
      }

      return book;
    } catch (err) {
      console.error('Error fetching book:', err);
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function createBook(data) {
    isLoading.value = true;
    error.value = null;
    try {
      const usersStore = useUsersStore();
      const currentTeam = usersStore.currentTeam;
      
      if (!currentTeam) {
        throw new Error('No team selected');
      }

      // Add teamId to the data
      const bookData = {
        ...data,
        teamId: currentTeam.id
      };

      const response = await fetchWithAuth('/api/books', {
        method: 'POST',
        body: JSON.stringify(bookData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create book');
      }

      const newBook = await response.json();
      
      // Add to teams store books list
      const teamsStore = useTeamsStore();
      teamsStore.currentTeamBooks.push(newBook);
      
      return newBook;
    } catch (err) {
      console.error('Error creating book:', err);
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function updateBook(id, updates) {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await fetchWithAuth(`/api/books/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update book');
      }

      const updatedBook = await response.json();
      
      // Update in teams store books list
      const teamsStore = useTeamsStore();
      const index = teamsStore.currentTeamBooks.findIndex(w => w.id === parseInt(id));
      if (index !== -1) {
        teamsStore.currentTeamBooks[index] = updatedBook;
      }

      // Update current book if it's the one being edited
      if (currentBook.value && currentBook.value.id === parseInt(id)) {
        currentBook.value = updatedBook;
      }

      return updatedBook;
    } catch (err) {
      console.error('Error updating book:', err);
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function deleteBook(id) {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await fetchWithAuth(`/api/books/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete book');
      }

      // Remove from teams store books list
      const teamsStore = useTeamsStore();
      const index = teamsStore.currentTeamBooks.findIndex(w => w.id === parseInt(id));
      if (index !== -1) {
        teamsStore.currentTeamBooks.splice(index, 1);
      }

      // Reset current book if it's the one being deleted
      if (currentBook.value && currentBook.value.id === parseInt(id)) {
        currentBook.value = teamsStore.currentTeamBooks.length > 0 ? teamsStore.currentTeamBooks[0] : null;
      }
    } catch (err) {
      console.error('Error deleting book:', err);
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function restoreBook(id) {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await fetchWithAuth(`/api/books/${id}/restore`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to restore book');
      }

      const restoredBook = await response.json();
      
      // Add to teams store books list
      const teamsStore = useTeamsStore();
      teamsStore.currentTeamBooks.push(restoredBook);
      
      return restoredBook;
    } catch (err) {
      console.error('Error restoring book:', err);
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  // Internal method for setting current book and loading all dependent data
  async function setCurrentBook(book) {
    // Reset all stores first to clear previous book data
    resetBookData();

    // Set current book
    currentBook.value = book;

    // Return early if no book was provided
    if (!book) return null;

    // Load all dependent data for this book
    isLoading.value = true;
    error.value = null;

    try {
      // Get stores
      const accountsStore = useAccountsStore();
      const categoriesStore = useCategoriesStore();
      const teamsStore = useTeamsStore();

      // Load team users for permission checks
      await teamsStore.fetchTeamUsers(book.team_id);

      // Load data in parallel
      await Promise.all([
        accountsStore.fetchAccounts(book.id),
        categoriesStore.fetchCategories(book.id)
      ]);

      return book;
    } catch (err) {
      console.error('Error loading book data:', err);
      error.value = 'Failed to load book data: ' + err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  // Function to reset all book-related data
  function resetBookData() {
    const accountsStore = useAccountsStore();
    const categoriesStore = useCategoriesStore();
    const transactionsStore = useTransactionsStore();

    // Reset each store
    accountsStore.resetState();
    categoriesStore.resetState();
    transactionsStore.resetState();
  }

  // Loads a book by ID with validation and all dependent data
  async function loadBookById(bookId) {
    isLoading.value = true;
    error.value = null;

    try {
      const usersStore = useUsersStore();
      const teamsStore = useTeamsStore();
      const currentTeam = usersStore.currentTeam;
      
      if (!currentTeam) {
        throw new Error('No team selected');
      }

      // Ensure books are loaded in teams store
      if (teamsStore.currentTeamBooks.length === 0) {
        await teamsStore.fetchTeamBooks(currentTeam.id);
      }

      // Check if book exists in the team's books
      const bookExists = teamsStore.getBookById(bookId);
      if (!bookExists) {
        error.value = 'Book not found';
        return { success: false, error: 'invalid-book' };
      }

      // Fetch the latest book data from the API to ensure freshness
      const book = await fetchBookById(bookId);

      // Set as current book and load all its dependent data
      await setCurrentBook(book);

      return { success: true, book };
    } catch (err) {
      console.error('Error loading book:', err);
      error.value = err.message;
      return { success: false, error: 'book-error' };
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Saves book data (create or update based on presence of ID)
   * @param {Object} bookData - Book data to save
   * @returns {Promise<Object>} The saved book
   */
  async function saveBook(bookData) {
    try {
      isLoading.value = true;
      error.value = null;

      let savedBook;
      if (bookData.id) {
        // Update existing book
        savedBook = await updateBook(bookData.id, {
          name: bookData.name,
          note: bookData.note,
          currency_symbol: bookData.currency_symbol,
          week_start: bookData.week_start
        });
      } else {
        // Create new book
        savedBook = await createBook({
          name: bookData.name,
          note: bookData.note,
          currency_symbol: bookData.currency_symbol,
          week_start: bookData.week_start
        });
      }

      return savedBook;
    } catch (error) {
      error.value = error.message;
      throw error;
    } finally {
      isLoading.value = false;
    }
  }

  // Actions

  return {
    // State
    currentBook,
    isLoading,
    error,

    // Getters
    hasAdminPermission,
    hasWritePermission,

    // Actions
    fetchBookById,
    createBook,
    updateBook,
    deleteBook,
    restoreBook,
    resetBookData,
    loadBookById,
    saveBook
  };
});