# TransactionsFeedView - Quick Reference

## Overview
A card-based interface for viewing and managing transactions with real-time search and modal editing capabilities.

## Key Features
- ✅ Card-based transaction display
- ✅ Real-time search filtering
- ✅ Permission-aware editing
- ✅ Shared TransactionModal integration
- ✅ Responsive grid layout
- ✅ Bootstrap 5.3 dark mode support

## User Actions
| Action | Permission Required | Result |
|--------|-------------------|--------|
| View transactions | Read access | Shows transaction cards |
| Search transactions | Read access | Filters cards in real-time |
| Edit transaction | Write access | Opens TransactionModal |
| Delete transaction | Write access | Confirms and deletes |
| Duplicate transaction | Write access | Creates copy |

## Component Props
None - Uses route query parameter `bookId`

## Component Events
None - Self-contained component

## Store Dependencies
- `useBooksStore()` - Current book, permissions, accounts
- `useTransactionsStore()` - CRUD operations, data fetching

## API Endpoints
- `GET /api/books/{bookId}/transactions` - Fetch transactions
- `POST /api/transactions` - Create transaction
- `PUT /api/transactions/{id}` - Update transaction  
- `DELETE /api/transactions/{id}` - Delete transaction

## Responsive Breakpoints
- Mobile (xs): 1 card per row
- Small (sm): 2 cards per row
- Large (lg): 3 cards per row
- Extra Large (xl): 4 cards per row

## Search Functionality
- **Field**: Transaction description
- **Type**: Case-insensitive, partial match
- **Performance**: Real-time via computed property
- **Reset**: Clear button when search is active

## Permission Handling
- **No Permission**: Redirects to books view
- **Read Only**: Shows edit button but opens modal in view mode
- **Write Access**: Full CRUD functionality available

## Error States
- **Loading**: Spinner during data fetch
- **Empty**: "No transactions found" with helpful message
- **Network Error**: Graceful fallback with console logging

## Related Components
- `TransactionModal` - Shared editing modal
- `BookLayout` - Layout wrapper
- `CategorySelect` - Category selection
- `CurrencyInput` - Amount input formatting

## File Locations
- **Component**: `/src/pages/transactionsFeed/TransactionsFeedView.vue`
- **Documentation**: `/features_documentation/transactions/`
- **Tests**: Not yet implemented

## Future Enhancements
- [ ] Date range filtering
- [ ] Category filtering  
- [ ] Bulk operations
- [ ] Export functionality
- [ ] Infinite scroll
- [ ] Quick edit inline

## Common Issues
1. **Missing bookId**: Component redirects to books view
2. **Invalid book**: Redirects to 404 page
3. **Permission denied**: Shows read-only interface
4. **Network failure**: Shows empty state with error logging
