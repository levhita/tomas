# Copilot Instructions for Project

# Scope on changes

Keep the frontend following what is already implemented in the API, always check with incodeAPI.js in the frontend and with the routes in the API to validate that what is done is correct.

Furthermore, check with schema.sql to validate that the database schema is correct and that the API is returning the expected data.

## styling
We use Bootstrap 5.3 for styling and layout. Please ensure that any new components or pages adhere to the Bootstrap 5 guidelines.

We use Bootstrap 5.3 which has native dark mode support. Please ensure that any new components or pages are compatible with dark mode.

Including using bg-body-secondary, bg-body-primary, bg-body-tertiary for backgrounds, instead of bg-light, bg-dark, etc.

Prefer to use bootstrap styles and classes, when in need add the custom styles to the main style.css file instead of inline or scoped styles.

All input field should use the `form-floating` class for floating labels.

For the admin section keep the admin styles in the `admin.css` file, and use the `admin` class to scope them.

## components

We use Vue 3 for components. Please ensure that any new components or pages adhere to the Vue 3 guidelines.
We use Vue 3 with the Composition API. Please ensure that any new components or pages use the Composition API.
We use Vue Router for routing. Please ensure that any new components or pages are compatible with Vue Router.

Whenever possible move logic to the store, and use the store to manage state. This will help keep components clean and focused on presentation.

Whenever possible split components into smaller, reusable components. This will help keep components clean and focused on presentation.

## state management
We use Pinia for state management. Please ensure that any new components or pages are compatible with Pinia.
We use Pinia with the Composition API. Please ensure that any new components or pages use the Composition API.
We use Pinia with the `defineStore` function. Please ensure that any new stores use the `defineStore` function.

## Credit vs debit accounts

For credit accounts, the logic is reversed because:

Debit accounts: Expenses decrease the balance (negative), Income increases the balance (positive)
Credit accounts: Expenses increase the debt/balance (positive), Income/payments decrease the debt/balance (negative)