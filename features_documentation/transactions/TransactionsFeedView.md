# TransactionsFeedView Feature Documentation

## Overview

The TransactionsFeedView is a card-based transaction display interface that provides users with a visual and intuitive way to browse, search, and manage financial transactions within a book. This view complements the existing table-based transaction views by offering a more visual, card-based approach that's particularly effective for mobile devices and when users want to quickly scan transaction details.

## Location

- **Component Path**: `/src/pages/transactionsFeed/TransactionsFeedView.vue`
- **Route**: Accessed via book navigation with `?bookId=<id>` query parameter
- **Layout**: Uses `BookLayout` for consistent book-scoped navigation

## Key Features

### 1. Card-Based Transaction Display

Each transaction is displayed as an individual card containing:

- **Transaction Type Badge**: Visual indicator (Income, Expense, Payment, Charge) with color coding
- **Date**: Transaction date in localized format
- **Description**: Primary transaction description as card title
- **Amount**: Formatted currency amount with type-based color coding
- **Account Name**: Source/destination account with building icon
- **Category Badge**: Optional category display when assigned
- **Note**: Optional additional details with note icon
- **Exercised Status**: Visual status indicator (Exercised/Pending)
- **Edit Button**: Full-width action button for transaction management

### 2. Search Functionality

- **Description Search**: Real-time filtering by transaction description
- **Search Input**: Floating label input with search icon
- **Active Search Display**: Shows clear search button when search is active
- **Case-Insensitive**: Search is not case-sensitive for better UX

### 3. Transaction Management

#### Edit Functionality
- **Permission-Aware**: Checks user write permissions before allowing edits
- **Modal Integration**: Uses the shared `TransactionModal` component
- **Full CRUD Operations**: Create, Read, Update, Delete via modal
- **Duplicate Support**: Ability to duplicate transactions

#### Permission Handling
- **Read-Only Mode**: Users without write permissions see transactions in read-only mode
- **Graceful Degradation**: Edit attempts by read-only users show modal in view mode
- **Role-Based Access**: Respects book-level user roles (admin, collaborator, viewer)

### 4. Responsive Design

- **Grid Layout**: Responsive card grid using Bootstrap columns
  - `col-12`: Full width on mobile
  - `col-sm-6`: 2 cards per row on small screens
  - `col-lg-4`: 3 cards per row on large screens
  - `col-xl-3`: 4 cards per row on extra large screens
- **Card Sizing**: Equal height cards with flex layout
- **Mobile-First**: Optimized for touch interactions

### 5. Visual Design System

#### Color Coding
- **Transaction Types**: Consistent color coding across the application
  - Income/Payment: Success colors (green)
  - Expense/Charge: Danger colors (red)
- **Status Indicators**: 
  - Exercised: Success (green)
  - Pending: Warning (yellow/orange)

#### Bootstrap Integration
- **Dark Mode Support**: Uses Bootstrap 5.3 native dark mode classes
- **Semantic Colors**: `bg-body-secondary`, `text-light-emphasis` for theme compatibility
- **Component Consistency**: Aligns with existing application design patterns

## Technical Implementation

### Component Architecture

```vue
TransactionsFeedView
├── BookLayout (wrapper)
├── Search Form
│   ├── Floating Label Input
│   └── Clear Search Button
├── Transaction Cards Grid
│   └── Individual Transaction Cards
└── TransactionModal (shared component)
```

### State Management

#### Local State
- `transactions`: Array of transactions for current book
- `loading`: Loading state during data fetches
- `searchQuery`: Current search filter text
- `showModal`: Modal visibility state
- `currentTransaction`: Transaction being edited
- `isEditing`: Edit vs create mode flag
- `modalFocusTarget`: Focus target for modal ('description' or 'amount')

#### Store Integration
- **BooksStore**: Current book data, permissions, currency formatting
- **TransactionsStore**: CRUD operations, data fetching, state management

### Data Flow

1. **Initialization**: 
   - Validates book ID from route query
   - Loads book data and permissions
   - Fetches all transactions for the book

2. **Search Flow**:
   - Real-time filtering via computed property
   - Debounced search input for performance
   - Clear search functionality

3. **Edit Flow**:
   - Permission check before modal display
   - Shared modal component for consistency
   - Post-operation data refresh

### API Integration

#### Endpoints Used
- `GET /api/books/{bookId}/transactions`: Fetch transactions with pagination
- `POST /api/transactions`: Create new transaction
- `PUT /api/transactions/{id}`: Update existing transaction
- `DELETE /api/transactions/{id}`: Delete transaction

#### Query Parameters
- `limit`: Number of transactions to fetch (default: 1000)
- `sortKey`: Sort field (default: 'date')
- `sortDirection`: Sort order (default: 'desc')

## User Experience

### Navigation Flow
1. User selects a book from books view
2. Navigates to transactions feed via book menu
3. Views transactions in card format
4. Can search, filter, and edit transactions
5. Changes persist across navigation

### Interaction Patterns
- **Click to Edit**: Single click on edit button opens transaction modal
- **Search as You Type**: Immediate filtering without submit button
- **Clear Search**: One-click search reset
- **Modal Focus**: Automatic focus management for form fields

### Loading States
- **Initial Load**: Spinner while book and transactions load
- **Empty State**: Helpful message when no transactions exist
- **Search Results**: Dynamic filtering with no additional loading

## Component Reuse

### Shared Components
- `TransactionModal`: Full-featured transaction CRUD modal
- `BookLayout`: Consistent book-scoped layout
- `formatCurrency`, `formatTransactionType`, `colorByType`: Utility functions

### Design Patterns
- **Permission-Aware UI**: Consistent permission checking across features
- **Modal Management**: Standardized modal state management
- **Error Handling**: Consistent error logging and user feedback
- **Data Refresh**: Post-operation data synchronization

## Future Enhancements

### Planned Features (TODO in code)
- **Date Range Filter**: Start/end date filtering for transactions
- **Category Filtering**: Filter by transaction categories
- **Bulk Operations**: Multi-select for bulk actions
- **Export Functionality**: Export filtered transactions
- **Advanced Search**: Search by amount, account, or multiple fields

### Potential Improvements
- **Infinite Scroll**: Load more transactions as user scrolls
- **Sorting Options**: Multiple sort criteria
- **Quick Actions**: Inline quick edit for simple fields
- **Transaction Templates**: Save and reuse common transactions

## Testing Considerations

### Test Scenarios
- **Permission Testing**: Verify read-only behavior for viewers
- **Search Functionality**: Test various search queries and edge cases
- **Modal Integration**: Verify CRUD operations work correctly
- **Responsive Behavior**: Test across different screen sizes
- **Error Handling**: Test with network failures and invalid data

### Accessibility
- **Keyboard Navigation**: Ensure all interactive elements are keyboard accessible
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Color Contrast**: Sufficient contrast for all text and backgrounds
- **Focus Management**: Logical tab order and focus indicators

## Related Documentation
- [Visual Language Guidelines](./visual_language.md)
- [Transaction Modal Component](../../frontend/src/components/modals/TransactionModal.vue)
- [Books Store Documentation](../../frontend/src/stores/books.js)
- [Transactions Store Documentation](../../frontend/src/stores/transactions.js)
