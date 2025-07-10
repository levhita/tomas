<template>
  <BookLayout>
    <div class="container p-1">
      <h2 class="mb-4">Transactions View</h2>
      <div v-if="booksStore.isLoading" class="text-center my-5">
        <div class="spinner-border" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>
      <div v-else-if="booksStore.error" class="alert alert-danger">
        {{ booksStore.error }}
      </div>
      <div v-else-if="booksStore.currentBook">
        <p>Selected book: {{ booksStore.currentBook.name }}</p>
        <!-- Transaction content will go here -->
      </div>
    </div>
  </BookLayout>
</template>

<script setup>
import { onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useBooksStore } from '../../stores/books';
import BookLayout from '../../layouts/BookLayout.vue';

const router = useRouter();
const route = useRoute();
const booksStore = useBooksStore();

// Simplified validation function that uses the enhanced book store
async function validateAndSetBook() {
  // Get bookId from query parameter
  const bookId = route.query.bookId;

  // If bookId is missing, redirect to book selection
  if (!bookId) {
    router.replace({
      name: 'books',
      query: { error: 'missing-book' }
    });
    return false;
  }

  // Use the enhanced book store to validate and load everything
  const result = await booksStore.loadBookById(bookId);

  // Handle validation result
  if (!result.success) {
    if (result.error === 'invalid-book') {
      // For invalid books, show a 404 page instead of redirecting to books
      router.replace({ 
        name: 'not-found',
        query: { from: route.path }
      });
    } else {
      // For other errors, redirect to books with error message
      router.replace({
        name: 'books',
        query: { error: result.error }
      });
    }
    return false;
  }

  // Success - book and all dependent data are loaded
  return true;
}

onMounted(async () => {
  await validateAndSetBook();
});
</script>