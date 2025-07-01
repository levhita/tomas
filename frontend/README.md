# Tomas: Frontend DOCS 

# Tomas: Frontend DOCS 

## Getting Started: Development Setup

Follow these steps to get the frontend application running in development mode:

1. **Install Dependencies**

   Open your terminal, navigate to the `frontend` directory, and install the required packages:

   ```sh
   cd frontend
   npm install
   ```

2. **Environment Variables**

   Copy the example environment file and update it with your local configuration if needed:

   ```sh
   cp .env.example .env
   # Edit .env as needed for your API endpoints or other settings
   ```

3. **Run the Development Server**

   Start the Vite development server:

   ```sh
   npm run dev
   ```

   The app will be available at [http://localhost:5173](http://localhost:5173) by default.

4. **Storybook (Component Testing)**

   To run Storybook for component development and testing:

   ```sh
   npm run storybook
   ```

   Storybook will be available at [http://localhost:6006](http://localhost:6006).

5. **Running Frontend Tests**

   To run the frontend tests (using vitest and storybook/test):

   ```sh
   npm run test
   ```

   Only stories tagged as `stable` or `testable` will be executed.

---

## Development documentation 


### Authenticated Fetch Utility

The `src/utils/fetch.js` file provides a `fetchWithAuth` function that wraps the standard Fetch API to automatically include the user's authentication token (if present) in all requests. If a request returns a 401 Unauthorized response, it will clear the token and redirect the user to the login page.

You can use `fetchWithAuth` throughout the frontend application whenever you need to make authenticated API requests. This ensures consistent handling of authentication and error states across all API calls.

Example usage:
```js
import fetchWithAuth from '@/utils/fetch';

const response = await fetchWithAuth('/api/some-endpoint');
const data = await response.json();


