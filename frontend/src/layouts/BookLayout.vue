<template>
  <!-- 
    Main layout wrapper for book-specific pages
    Uses flexbox to ensure navbar stays at top and content fills remaining space
  -->
  <div class="book-layout">
    <!-- 
      Book-specific navigation bar
      Displays book name and book-specific navigation options
    -->
    <BookNavbar :book="currentBook" />

    <!-- 
      Main content area where page components are rendered
      Uses slot to allow any content to be inserted by parent components
    -->
    <div class="book-content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
/**
 * BookLayout Component
 * 
 * A layout component specifically designed for book-scoped pages.
 * Provides a consistent structure with book-specific navigation and
 * dynamic page title management based on the current book.
 * 
 * Features:
 * - Displays BookNavbar with current book information
 * - Automatically updates page title to show book name
 * - Provides flexible content area through slot system
 * - Maintains full viewport height layout with sticky navigation
 * - Integrates with book store for reactive book data
 * 
 * Page Title Management:
 * - Format: "{book.name}" (just the book name)
 * - Falls back to "Purrfect Finances" if no book is loaded
 * - Updates immediately when book changes (immediate: true)
 * - Useful for browser tab identification when working with multiple books
 * 
 * Layout Structure:
 * - Fixed navbar at top
 * - Flexible content area that grows to fill remaining space
 * - Full viewport height (100vh) layout
 * - Responsive design compatible
 * 
 * Usage:
 * <BookLayout>
 *   <YourPageContent />
 * </BookLayout>
 * 
 * Dependencies:
 * - Vue 3 Composition API (computed, watch)
 * - BookNavbar component
 * - Books store (for current book data)
 * 
 * @component
 * @example
 * <template>
 *   <BookLayout>
 *     <div class="container">
 *       <h1>Calendar View</h1>
 *       <!-- Calendar content here -->
 *     </div>
 *   </BookLayout>
 * </template>
 */

import { computed, watch } from 'vue';
import BookNavbar from '../components/navbars/BookNavbar.vue';
import { useBooksStore } from '../stores/books';

// Access the books store for reactive book data
const booksStore = useBooksStore();

/**
 * Computed property that reactively returns the current book
 * 
 * This computed property automatically updates when the book store's
 * currentBook changes, ensuring the layout always reflects the
 * most up-to-date book information.
 * 
 * @type {import('vue').ComputedRef<Object|null>}
 * @returns {Object|null} Current book object or null if none selected
 * 
 * @example
 * // Book object structure:
 * {
 *   id: 1,
 *   name: "Personal Budget",
 *   note: "My personal finances",
 *   created_at: "2024-01-01T00:00:00Z"
 * }
 */
// Get the current book object from the store
const currentBook = computed(() => booksStore.currentBook);

/**
 * Watcher for dynamic page title updates
 * 
 * Automatically updates the browser's page title whenever the current
 * book changes. This provides better user experience by showing
 * the book name in the browser tab.
 * 
 * Title formats:
 * - With book: "{book.name}" (e.g., "Personal Budget")
 * - Without book: "Purrfect Finances"
 * 
 * The immediate: true option ensures the title is set when the component
 * mounts, handling cases where book is already loaded during initialization.
 * 
 * @param {Object|null} newBook - The new book object
 * 
 * @example
 * // When book changes to "Personal Budget":
 * // document.title becomes "Personal Budget"
 */
// Update page title when book changes
watch(currentBook, (newBook) => {
  if (newBook?.name) {
    document.title = `${newBook.name}`;
  } else {
    document.title = 'Tomás - Purrfect Budgets';
  }
}, { immediate: true });
</script>

<style scoped>
/**
 * Layout-specific styles for book pages
 * 
 * Creates a full-height flexible layout where the navbar stays fixed
 * at the top and the content area expands to fill remaining space.
 */

/**
 * Main layout container
 * 
 * Uses flexbox column layout to stack navbar and content vertically.
 * min-height: 100vh ensures the layout always fills the full viewport height,
 * even when content is minimal.
 */
.book-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/**
 * Content area styling
 * 
 * flex: 1 makes this area grow to fill all available space
 * after the navbar takes its required height. This ensures
 * the footer-like behavior where content fills the viewport.
 */
.book-content {
  flex: 1;
}
</style>