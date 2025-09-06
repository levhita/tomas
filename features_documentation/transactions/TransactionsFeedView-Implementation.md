# TransactionsFeedView - Developer Implementation Guide

## Component Structure

### File Organization
```
/src/pages/transactionsFeed/
└── TransactionsFeedView.vue    # Main component
```

### Dependencies
```javascript
// Vue 3 Composition API
import { onMounted, ref, watch, computed } from 'vue';

// Layouts and Components
import BookLayout from '../../layouts/BookLayout.vue';
import TransactionModal from '../../components/modals/TransactionModal.vue';

// Router
import { useRouter, useRoute } from 'vue-router';

// Stores
import { useBooksStore } from '../../stores/books';
import { useTransactionsStore } from '../../stores/transactions';

// Utilities
import { formatCurrency, formatTransactionType, colorByType } from '../../utils/utilities';
```

## Key Implementation Details

### 1. Permission System Integration

The component integrates with the application's permission system:

```javascript
function editTransaction(transaction) {
    // Check permissions before allowing edit
    if (!booksStore.hasWritePermission) {
        // Convert to readonly view if no write permission
        showTransactionModal({ transaction, editing: false });
        return;
    }
    
    showTransactionModal({ transaction, editing: true });
}
```

**Permission Levels:**
- **Admin**: Full read/write access to all transactions
- **Collaborator**: Read/write access to transactions in assigned books
- **Viewer**: Read-only access to transactions

### 2. Data Fetching Strategy

The component uses a comprehensive data fetching approach:

```javascript
async function fetchTransactions() {
    if (!booksStore.currentBook?.id) return;
    
    loading.value = true;
    try {
        const result = await transactionsStore.fetchTransactionsByBook(
            booksStore.currentBook.id,
            {
                limit: 1000, // Fetch all transactions
                sortKey: 'date',
                sortDirection: 'desc'
            }
        );
        transactions.value = result.transactions || [];
    } catch (error) {
        console.error('Error fetching transactions:', error);
        transactions.value = [];
    } finally {
        loading.value = false;
    }
}
```

**Key Points:**
- Fetches up to 1000 transactions (configurable)
- Sorts by date in descending order (newest first)
- Graceful error handling with fallback empty array
- Loading state management

### 3. Search Implementation

Real-time search filtering using computed properties:

```javascript
const filteredTransactions = computed(() => {
    let filtered = transactions.value;
    
    // Filter by description search
    if (searchQuery.value.trim()) {
        const query = searchQuery.value.toLowerCase();
        filtered = filtered.filter(transaction => 
            transaction.description?.toLowerCase().includes(query)
        );
    }
    
    return filtered;
});
```

**Search Features:**
- Case-insensitive search
- Real-time filtering (no submit required)
- Searches in transaction descriptions
- Extensible for additional search fields

### 4. Modal Integration Pattern

The component follows the established modal pattern used throughout the application:

```javascript
// Modal state management
const showModal = ref(false);
const currentTransaction = ref({});
const isEditing = ref(false);
const modalFocusTarget = ref('description');

// Modal display function
function showTransactionModal({ transaction, editing, focusOn = 'description' }) {
    if (editing && !booksStore.hasWritePermission) {
        editing = false; // Convert to readonly view
    }

    currentTransaction.value = transaction;
    isEditing.value = editing;
    modalFocusTarget.value = focusOn;
    showModal.value = true;
}
```

### 5. CRUD Operations

All CRUD operations include data refresh for consistency:

```javascript
async function saveTransaction(transaction) {
    try {
        if (isEditing.value) {
            await transactionsStore.updateTransaction(transaction.id, transaction);
        } else {
            await transactionsStore.addTransaction(transaction);
        }
        showModal.value = false;
        // Refresh transactions to show updated data
        await fetchTransactions();
    } catch (error) {
        console.error('Failed to save transaction:', error);
    }
}
```

## Styling and Bootstrap Integration

### Bootstrap 5.3 Classes Used

**Dark Mode Support:**
```vue
<input class="form-control bg-body-tertiary text-light-emphasis" />
<label class="text-light-emphasis">
```

**Card Layout:**
```vue
<div class="card h-100 bg-body-secondary border-0 shadow-sm">
    <div class="card-body d-flex flex-column">
```

**Responsive Grid:**
```vue
<div class="col-12 col-sm-6 col-lg-4 col-xl-3">
```

### Color Coding Implementation

The component uses the shared utility functions for consistent coloring:

```javascript
// Transaction type badge
:class="colorByType(formatTransactionType(transaction))"

// Amount display
:class="colorByType(formatTransactionType(transaction), 'text')"
```

## Error Handling Patterns

### 1. Route Validation
```javascript
async function validateAndSetBook() {
    const bookId = route.query.bookId;
    
    if (!bookId) {
        router.replace({
            name: 'books',
            query: { error: 'missing-book' }
        });
        return false;
    }

    const result = await booksStore.loadBookById(bookId);
    
    if (!result.success) {
        if (result.error === 'invalid-book') {
            router.replace({ 
                name: 'not-found',
                query: { from: route.path }
            });
        } else {
            router.replace({
                name: 'books',
                query: { error: result.error }
            });
        }
        return false;
    }
    
    return true;
}
```

### 2. API Error Handling
- All async operations wrapped in try-catch blocks
- Errors logged to console for debugging
- Graceful fallbacks (empty arrays, default values)
- User-friendly error states in UI

## Performance Considerations

### 1. Computed Properties
- Search filtering uses computed properties for automatic reactivity
- Avoids unnecessary re-computations through Vue's reactivity system

### 2. Data Fetching
- Single fetch on component mount
- Refresh only after CRUD operations
- Configurable limit to prevent excessive data loading

### 3. Event Handling
- Debounced search input (handled by Vue reactivity)
- Efficient filtering using JavaScript array methods

## Testing Strategy

### Unit Tests
```javascript
// Test search functionality
expect(wrapper.vm.filteredTransactions).toHaveLength(expectedCount);

// Test permission handling
expect(wrapper.find('[data-testid="edit-button"]').exists()).toBe(hasPermission);

// Test modal integration
await wrapper.find('[data-testid="edit-button"]').trigger('click');
expect(wrapper.vm.showModal).toBe(true);
```

### Integration Tests
- Test with different user permission levels
- Verify modal integration works correctly
- Test data refresh after CRUD operations

### E2E Tests
- Search functionality across different scenarios
- Complete transaction edit workflow
- Permission-based feature access

## Deployment Considerations

### Environment Variables
- API endpoints configured through environment variables
- Debug logging controlled by environment settings

### Browser Support
- Modern browsers supporting ES6+ features
- Bootstrap 5.3 CSS compatibility
- Vue 3 compatibility requirements

## Maintenance Notes

### Code Organization
- Single-file Vue component with clear section separation
- Consistent naming conventions throughout
- Well-documented functions and computed properties

### Dependencies
- Keep Vue 3 and related packages updated
- Monitor Bootstrap updates for new features
- Regular security updates for all dependencies

### Future Refactoring Opportunities
- Extract search functionality into composable
- Create reusable card component for transactions
- Implement virtual scrolling for large datasets
