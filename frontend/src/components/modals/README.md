# Modal Components

This directory contains reusable modal components used throughout the application.

## UserModal.vue

A comprehensive modal dialog for creating and editing users in the admin interface.

### Usage

```vue
<template>
  <div>
    <!-- Your page content -->
    
    <!-- User Modal -->
    <UserModal 
      v-model="showUserModal" 
      :user="selectedUser" 
      @save="handleUserSaved" 
    />
  </div>
</template>

<script setup>
import UserModal from '../components/modals/UserModal.vue'

const showUserModal = ref(false)
const selectedUser = ref(null)

// Create new user
function createUser() {
  selectedUser.value = null
  showUserModal.value = true
}

// Edit existing user
function editUser(user) {
  selectedUser.value = user
  showUserModal.value = true
}

// Handle successful user save
function handleUserSaved() {
  // Refresh data or perform other actions
  console.log('User saved successfully!')
}
</script>
```

### Props

- `modelValue` (Boolean): Controls modal visibility
- `user` (Object|null): User object for editing, null for creation

### Events

- `update:modelValue`: Emitted when modal should be closed
- `save`: Emitted when user is successfully created/updated

### Features

- ✅ Create new users with username, password, and admin privileges
- ✅ Edit existing users (username, password, admin status)
- ✅ Real-time form validation with error feedback
- ✅ Password confirmation validation
- ✅ Bootstrap modal integration with proper accessibility
- ✅ Error and success message display
- ✅ Loading states during API calls
- ✅ Admin CSS styling for consistency
- ✅ Focus management and keyboard navigation

### Validation Rules

- Username: Required, minimum 3 characters
- Password: Required for new users, minimum 6 characters
- Password confirmation: Must match password when provided
- Super admin flag: Boolean toggle

### API Integration

The component integrates with the users store and makes the following API calls:

- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update existing user

### Styling

The component uses admin-specific CSS classes from `src/admin.css` for consistent styling with the admin interface.
