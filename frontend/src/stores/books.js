import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import fetchWithAuth from '../utils/fetch';
import { useAccountsStore } from './accounts';
import { useCategoriesStore } from './categories';
import { useTransactionsStore } from './transactions';
import { useUsersStore } from './users';

export const useBooksStore = defineStore('books', () => {
  // State
  const books = ref([]);
  const currentBook = ref(null);
  const isLoading = ref(false);
  const error = ref(null);
  const currentBookUsers = ref([]);

  // Getters
  const booksByName = computed(() => {
    return books.value.sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  });

  const getBookById = computed(() => {
    return (id) => books.value.find(w => w.id === parseInt(id));
  });

  // Permission-related getters
  const hasAdminPermission = computed(() => {
    if (!currentBook.value) return false;

    const usersStore = useUsersStore();
    const currentUser = usersStore.currentUser;

    // Check if user has admin role in this book
    const userEntry = currentBookUsers.value.find(
      entry => entry.id === currentUser?.id
    );

    return userEntry?.role === 'admin';
  });

  // General write permission - for users who can edit (admin or collaborator)
  // This determines if user can add/edit categories and transactions
  const hasWritePermission = computed(() => {
    if (!currentBook.value) return false;

    const usersStore = useUsersStore();
    const currentUser = usersStore.currentUser;

    // Admin in this book has write permissions
    if (hasAdminPermission.value) return true;

    // Check if user has collaborator role in this book
    const userEntry = currentBookUsers.value.find(
      entry => entry.id === currentUser?.id
    );

    return userEntry?.role === 'admin' || userEntry?.role === 'collaborator';
  });

  // Actions
  async function fetchBooks() {
    isLoading.value = true;
    error.value = null;
    try {
      const usersStore = useUsersStore();
      const currentTeam = usersStore.currentTeam;
      
      if (!currentTeam) {
        throw new Error('No team selected');
      }

      const response = await fetchWithAuth(`/api/books?teamId=${currentTeam.id}`);
      const data = await response.json();
      books.value = data;

      // Set current book if none is selected
      if (!currentBook.value && data.length > 0) {
        currentBook.value = data[0];
      }

      return data;
    } catch (err) {
      console.error('Error fetching books:', err);
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

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

      // Update in list if exists
      const index = books.value.findIndex(w => w.id === parseInt(id));
      if (index !== -1) {
        books.value[index] = book;
      } else {
        books.value.push(book);
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
      books.value.push(newBook);
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
      const index = books.value.findIndex(w => w.id === parseInt(id));
      if (index !== -1) {
        books.value[index] = updatedBook;
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

      const index = books.value.findIndex(w => w.id === parseInt(id));
      if (index !== -1) {
        books.value.splice(index, 1);
      }

      // Reset current book if it's the one being deleted
      if (currentBook.value && currentBook.value.id === parseInt(id)) {
        currentBook.value = books.value.length > 0 ? books.value[0] : null;
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
      books.value.push(restoredBook);
      return restoredBook;
    } catch (err) {
      console.error('Error restoring book:', err);
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function getBookUsers(id) {
    isLoading.value = true;
    error.value = null;
    try {
      // First get the book to find its team_id
      const bookResponse = await fetchWithAuth(`/api/books/${id}`);
      if (!bookResponse.ok) {
        const errorData = await bookResponse.json();
        throw new Error(errorData.error || 'Failed to fetch book details');
      }
      
      const book = await bookResponse.json();
      if (!book.team_id) {
        throw new Error('Book does not have an associated team');
      }

      // Now get the team users
      const response = await fetchWithAuth(`/api/teams/${book.team_id}/users`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch book users');
      }

      const users = await response.json();

      // If this is for the current book, update the users list
      if (currentBook.value && currentBook.value.id === parseInt(id)) {
        currentBookUsers.value = users;
      }

      return users;
    } catch (err) {
      console.error('Error fetching book users:', err);
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function addUserToBook(bookId, userId) {
    isLoading.value = true;
    error.value = null;
    try {
      // First get the book to find its team_id
      const bookResponse = await fetchWithAuth(`/api/books/${bookId}`);
      if (!bookResponse.ok) {
        const errorData = await bookResponse.json();
        throw new Error(errorData.error || 'Failed to fetch book details');
      }
      
      const book = await bookResponse.json();
      if (!book.team_id) {
        throw new Error('Book does not have an associated team');
      }

      // Add user to the team instead of the book
      const response = await fetchWithAuth(`/api/teams/${book.team_id}/users`, {
        method: 'POST',
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add user to team');
      }

      const updatedUsers = await response.json();

      // Update book users if it's the current book
      if (currentBook.value && currentBook.value.id === parseInt(bookId)) {
        currentBookUsers.value = updatedUsers;
      }

      return updatedUsers;
    } catch (err) {
      console.error('Error adding user to book:', err);
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function removeUserFromBook(bookId, userId) {
    isLoading.value = true;
    error.value = null;
    try {
      // First get the book to find its team_id
      const bookResponse = await fetchWithAuth(`/api/books/${bookId}`);
      if (!bookResponse.ok) {
        const errorData = await bookResponse.json();
        throw new Error(errorData.error || 'Failed to fetch book details');
      }
      
      const book = await bookResponse.json();
      if (!book.team_id) {
        throw new Error('Book does not have an associated team');
      }

      // Remove user from the team instead of the book
      const response = await fetchWithAuth(`/api/teams/${book.team_id}/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove user from team');
      }

      // Update book users if it's the current book
      if (currentBook.value && currentBook.value.id === parseInt(bookId)) {
        const updatedUsers = currentBookUsers.value.filter(
          user => user.id !== parseInt(userId)
        );
        currentBookUsers.value = updatedUsers;
      }
    } catch (err) {
      console.error('Error removing user from book:', err);
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  // Enhanced method for setting current book and loading all dependent data
  async function setCurrentBookAndLoadData(book) {
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

      // Load book users for permission checks
      currentBookUsers.value = await getBookUsers(book.id);

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

  // Validates book ID and loads the book with all related data
  async function validateAndLoadBook(bookId) {
    isLoading.value = true;
    error.value = null;

    try {
      // Ensure books are loaded
      if (books.value.length === 0) {
        await fetchBooks();
      }

      // Find the book
      const book = getBookById.value(bookId);

      // If book doesn't exist
      if (!book) {
        error.value = 'Book not found';
        return { success: false, error: 'invalid-book' };
      }

      // Load the book and all its data
      await setCurrentBookAndLoadData(book);

      return { success: true, book };
    } catch (err) {
      console.error('Error validating book:', err);
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

  return {
    // State
    books,
    currentBook,
    currentBookUsers,
    isLoading,
    error,

    // Getters
    booksByName,
    getBookById,
    hasAdminPermission,
    hasWritePermission,

    // Actions
    fetchBooks,
    fetchBookById,
    createBook,
    updateBook,
    deleteBook,
    restoreBook,
    getBookUsers,
    addUserToBook,
    removeUserFromBook,
    setCurrentBookAndLoadData,
    resetBookData,
    validateAndLoadBook,
    saveBook
  };
});