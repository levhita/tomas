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
```

### Utilities Functions

The `src/utils/utilities.js` file provides shared utility functions for use throughout the frontend application. These utilities help ensure consistent formatting and behavior across all components.

#### formatCurrency

Using the `formatCurrency` utility throughout your components ensures that all currency values are displayed in a consistent and locale-aware manner. This helps maintain a professional and user-friendly interface, regardless of where or how currency values are shown.

**Consistency and Logic Benefits:**

- **Uniform Display:** By centralizing currency formatting, you avoid discrepancies in how amounts appear across different pages or components (e.g., account balances, transaction lists, reports).
- **Locale Awareness:** The utility respects user or workspace locale preferences, ensuring numbers and symbols are formatted correctly for each audience (e.g., "1,000.00 €" vs "1.000,00 €").
- **Reduced Duplication:** Instead of repeating formatting logic in multiple places, you call a single function, making the codebase easier to maintain and update.
- **Error Prevention:** Centralized formatting reduces the risk of mistakes, such as missing currency symbols or incorrect decimal separators.
- **Theming and Accessibility:** Consistent formatting supports theming (like dark mode) and accessibility, as users can rely on familiar patterns throughout the app.

**Example Use Cases:**

- Displaying account balances in dashboards and summaries.
- Showing transaction amounts in lists, tables, and detail views.
- Formatting totals in reports and exports.
- Ensuring admin and user views both present currency values identically.

By always using `formatCurrency`, you help guarantee a predictable and polished experience for all users.

Utility Firm: 
 #### `formatCurrency(amount, currencySymbol = '$', locale = undefined)`

Formats a number as a currency string using the specified currency symbol and locale.

- **Parameters:**
  - `amount` (`number`): The numeric amount to format.
  - `currencySymbol` (`string`, optional): The symbol to use for the currency (e.g., `$`, `€`, `¥`). Defaults to `$`.
  - `locale` (`string`, optional): The locale to use for formatting (e.g., `'en-US'`, `'fr-FR'`). Defaults to the user's locale if not provided.

- **Returns:**  
  A string representing the formatted currency value, using the provided symbol and locale.

- **Example:**
  ```js
  import { formatCurrency } from '@/utils/utilities';

  const formatted = formatCurrency(1234.56, '€', 'de-DE');
  // formatted: "1.234,56 €"
  ```




