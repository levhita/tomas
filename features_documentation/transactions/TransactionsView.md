# TransactionsView Documentation

## Overview

The TransactionsView is a full-page workspace-scoped component designed for displaying and managing financial transactions in a responsive card grid layout. This view provides filtering, searching, and transaction display capabilities following the project's visual language guidelines.

## Current Implementation Status

### ✅ Completed Features

#### **Layout & Structure**
- **Full-page mode**: Implements workspace-scoped full-page layout
- **Responsive design**: Bootstrap 5.3 grid system with optimal column distribution
- **Card-based display**: Clean, modern card layout for transaction presentation
- **Mobile-friendly**: Responsive breakpoints from 1 to 5 columns based on screen size

#### **Filtering & Search**
- **Text search**: Global search across transaction descriptions, notes, categories, and accounts
- **Account filtering**: Dropdown filter to show transactions from specific accounts or all accounts
- **Reset filters**: One-click button to clear all applied filters
- **Real-time filtering**: Automatic re-fetching when filters change

#### **Data Integration**
- **API Integration**: Direct connection to `/api/transactions/:workspaceId/all` endpoint
- **Authentication**: JWT token-based secure API access
- **Error handling**: Graceful error states with user feedback
- **Loading states**: Proper loading indicators and empty states

#### **Visual Language Compliance**
- **Consistent color coding**: Uses `colorByType()` utility for transaction type colors
- **Typography hierarchy**: Clear visual hierarchy with Bootstrap typography
- **Icon usage**: Contextual Bootstrap icons for better UX
- **Theme support**: Compatible with Bootstrap 5.3 dark mode


## Technical Architecture

### **Component Structure**
```
TransactionsView.vue
├── WorkspaceLayout (layout wrapper)
├── Filters Form (search + account filter + reset)
├── Transactions Grid (responsive card layout)
└── Empty State (when no transactions found)
```

### **Data Flow**
1. **Workspace validation**: Validates workspace ID from route parameters
2. **Account loading**: Fetches workspace accounts for filter dropdown
3. **Transaction fetching**: Loads paginated transactions with applied filters
4. **Real-time updates**: Watchers trigger re-fetch on filter changes

### **API Integration**
- **Endpoint**: `GET /api/transactions/:workspaceId/all`
- **Parameters**: `accountId`, `search`, `page`, `limit`, `sortKey`, `sortDirection`
- **Authentication**: Bearer token from localStorage
- **Response**: `{ transactions: [], total: number }`

### **State Management**
```javascript
// Core data
transactions: ref([])     // Current transaction list
total: ref(0)            // Total count for pagination

// Pagination
page: ref(1)             // Current page number
limit: ref(10)           // Records per page

// Sorting
sortKey: ref('date')     // Sort column
sortDirection: ref('desc') // Sort direction

// Filtering
searchQuery: ref('')     // Text search term
selectedAccountId: ref(null) // Account filter
```

## Visual Components

### **Card Layout**
Each transaction is displayed as a Bootstrap card with:

- **Header**: Transaction description + color-coded amount
- **Category badge**: Visual category identifier
- **Footer**: Account name + formatted date
- **Note section**: Optional transaction notes (conditional display)

### **Color Coding System**
Consistent with reportsView using utility functions:
- `formatTransactionType(transaction)`: Determines transaction type
- `colorByType(type, 'text')`: Returns appropriate CSS color class
- Supports income (green), expenses (red), transfers, etc.

### **Responsive Breakpoints**
- **Mobile (xs)**: 1 column - `row-cols-1`
- **Small (sm)**: 2 columns - `row-cols-sm-2`  
- **Medium (md)**: 3 columns - `row-cols-md-3`
- **Large (lg)**: 4 columns - `row-cols-lg-4`
- **Extra Large (xl)**: 5 columns - `row-cols-xl-5`

## User Experience Features

### **Smart Date Formatting**
- **Current year**: Shows "Jan 15" (month + day only)
- **Other years**: Shows "Jan 15, 2024" (includes year)
- **Locale aware**: Uses browser's locale settings

### **Currency Display**
- **Workspace currency**: Uses `workspaceCurrencySymbol` from workspace settings
- **Fallback**: Defaults to '€' if no currency defined
- **Formatting**: Uses `formatCurrency()` utility for consistent display

### **Empty States**
- **No transactions**: User-friendly message with filter adjustment suggestion
- **Loading states**: Proper loading indicators during API calls
- **Error handling**: Console logging with graceful UI degradation

## File Location
```
/frontend/src/pages/TransactionsView.vue
/frontend/src/pages/TransactionsView.stories.ts (Unit Tests)
```

## Unit Testing

### **Test Coverage**
The TransactionsView component includes comprehensive unit tests implemented using Storybook with play functions, following the project's testing conventions.

### **Test Files Location**
```
/frontend/src/pages/TransactionsView.stories.ts
```

### **Test Scenarios**

#### **✅ Structural Tests**
- **Default Story**: Tests basic component rendering and structure
- **Form Elements**: Validates presence of search input, account filter, and reset button
- **Bootstrap Integration**: Verifies proper CSS classes and styling
- **Accessibility**: Tests ARIA attributes, form labels, and semantic HTML

#### **✅ Interactive Tests**
- **Filter Interactions**: Tests search input typing and account selection
- **Reset Functionality**: Verifies reset button clears all filter values
- **Form Validation**: Tests input attributes and form behavior
- **User Events**: Simulates real user interactions with userEvent

#### **✅ Responsive Design Tests**
- **Layout Responsiveness**: Tests component across mobile, tablet, and desktop viewports
- **Bootstrap Grid**: Validates responsive classes and layout behavior
- **Cross-Device Compatibility**: Ensures functionality works on all screen sizes

#### **✅ Visual Language Compliance**
- **Component Structure**: Tests adherence to project design patterns
- **CSS Classes**: Validates Bootstrap 5.3 classes and custom styling
- **Typography**: Tests heading hierarchy and text styling
- **Color Theming**: Verifies dark mode compatibility classes

### **Test Execution**
Tests are executed as part of the Storybook testing suite:

```bash
# Run all tests including TransactionsView
npm run test

# Run Storybook for interactive testing
npm run storybook
```

### **Test Tags**
- **`stable`**: Component is stable and ready for production
- **`testable`**: Component includes comprehensive test coverage

### **Mock Strategy**
Tests use simplified mocking approach:
- **Pinia Store**: Creates clean store instances for each test
- **No Complex Mocks**: Focuses on component behavior rather than API calls
- **User-Centric Testing**: Tests actual user interactions and visible outcomes

### **Future Test Enhancements**
- **API Integration Tests**: Add tests with mock API responses
- **Error State Testing**: Test API error handling scenarios
- **Performance Tests**: Add tests for large dataset handling
- **E2E Integration**: Extend to full end-to-end workflow tests


## Future Enhancements Roadmap

### **Phase 1: lazyloading **
- Implement lazyloading at scrolling through the transactions list  

### **Phase 3: CRUD Operations**
- Transaction creation modal
- Edit transaction functionality
- Delete confirmation dialogs


## Best Practices Implemented

- **Component separation**: Clear separation of concerns
- **Error boundaries**: Graceful error handling at all levels
- **Performance**: Efficient re-rendering with proper watchers
- **Accessibility**: Semantic HTML structure and proper ARIA attributes
- **Maintainability**: Well-documented code with clear function separation
- **Responsiveness**: Mobile-first design with progressive enhancement
