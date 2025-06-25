# Copilot Instructions for Project

# Scope on Changes

Keep the frontend following what is already implemented in the API, always check with incodeAPI.js in the frontend and with the routes in the API to validate that what is done is correct.

Furthermore, check with schema.sql to validate that the database schema is correct and that the API is returning the expected data.

## Styling
We use Bootstrap 5.3 for styling and layout. Please ensure that any new components or pages adhere to the Bootstrap 5 guidelines.

We use Bootstrap 5.3 which has native dark mode support. Please ensure that any new components or pages are compatible with dark mode.

Including using `bg-body-secondary`, `bg-body-primary`, `bg-body-tertiary` for backgrounds, instead of `bg-light`, `bg-dark`, etc.

Prefer to use bootstrap styles and classes, when in need add the custom styles to the main `styles/style.css` file instead of inline or scoped styles.

All input field should use the `form-floating` class for floating labels.

For the admin section keep the admin styles in the `styles/admin.css` file, and use the `admin` class to scope them.

## components

We use Vue 3 for components. Please ensure that any new components or pages adhere to the Vue 3 guidelines.
We use Vue 3 with the Composition API. Please ensure that any new components or pages use the Composition API.
We use Vue Router for routing. Please ensure that any new components or pages are compatible with Vue Router.

Whenever possible move logic to the store, and use the store to manage state. This will help keep components clean and focused on presentation.

Whenever possible split components into smaller, reusable components. This will help keep components clean and focused on presentation.

## State Management
We use Pinia for state management. Please ensure that any new components or pages are compatible with Pinia.
We use Pinia with the Composition API. Please ensure that any new components or pages use the Composition API.
We use Pinia with the `defineStore` function. Please ensure that any new stores use the `defineStore` function.

## Credit vs Debit accounts

Debit accounts: Expenses decrease the balance (negative), Income increases the balance (positive)
Credit accounts: Expenses increase the debt/balance (positive), Income/payments decrease the debt/balance (negative)

## Permissions
We use a permissions system to control access to certain features and pages. Please ensure that any new components or pages are compatible with the permissions system.

User roles outside workspaces:
- superadmin: Has access to admin dashboard features and can manage users and permissions.
- regular user: has access to his user profile and can view the workspaces he is a member of.

Inside workspaces superadmins dont have special permissions, they are treated as regular users with the roles they have assigned in the workspace.

The roles inside workspaces are:
- admin: full access to workspaces, can give other users access to workspaces, can manage edit where he is admin, and can view and edit accounts, categories and transactions.
- collaborator: can view and edit workspaces where he is a collaborator, can view accounts but cannot manage them. can view and edit categories. can view and edit transactions.
- viewer: can view workspaces where he is a viewer, can view accounts, categories and transactions but cannot edit them.

# Frontend Testing
We use Storybook 9 for component testing, this means that we need to use `storybook/test` instead of `@storybook/test` in the tests.

We use vitetest to run storybook stories as unit testing.

Stories in storybook have  play functions that are used to test the components. These play functions are run during `npm run test`.

When dont use test files, instead we use the `*.stories.js` files to define the stories and the play functions.

For running any frontend test, code changes or install packages you need to cd into frontend folder.

Only stories that are tagged as `stable` or `testable` will be run during the tests, this is to avoid running stories that are not ready for testing.

# API Testing
 We run test using the `/api/test.sh` script, inside the test we use `supertest` and run the tests directly against the API that in turn directly uses the database, effectively testing the API and the database together.

 We have  a test database that is used for testing, this database is created and populated with test data when the tests are run.

For running any api test, code changes or install packages you need to cd into api folder.
