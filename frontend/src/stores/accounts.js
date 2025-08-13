/**
 * Accounts Store
 * 
 * Manages individual account CRUD operations including:
 * - Creating, updating, and deleting accounts
 * - Account balance calculations and queries
 * - Account sorting and filtering utilities
 * 
 * Note: For book-context operations like fetching accounts for a book,
 * use the books store (booksStore.fetchBookAccounts, booksStore.addAccountToBook)
 * 
 * Account Types:
 * - Debit accounts: Expenses decrease balance (negative), Income increases balance (positive)
 * - Credit accounts: Expenses increase debt/balance (positive), Income/payments decrease debt/balance (negative)
 */
import { defineStore } from 'pinia';
import fetchWithAuth from '../utils/fetch';

export const useAccountsStore = defineStore('accounts', () => {
  // Actions
  
  /**
   * Fetch a single account by ID
   * @param {number} id - The account ID to fetch
   * @returns {Promise<Object>} The account data
   * @throws {Error} If account is not found or fetch fails
   */
  async function fetchAccountById(id) {
    try {
      const response = await fetchWithAuth(`/api/accounts/${id}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch account');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching account:', error);
      throw error;
    }
  }

  /**
   * Create a new account
   * @param {Object} account - The account data to create
   * @param {string} account.name - The account name
   * @param {string} account.type - The account type (debit/credit)
   * @param {number} account.starting_amount - The starting balance
   * @param {number} account.book_id - The book ID this account belongs to
   * @returns {Promise<Object>} The created account
   * @throws {Error} If account data is invalid or creation fails
   */
  async function createAccount(account) {
    try {
      // Make sure account has a book_id
      if (!account.book_id) {
        throw new Error('book_id is required when creating an account');
      }

      const response = await fetchWithAuth('/api/accounts', {
        method: 'POST',
        body: JSON.stringify(account),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create account');
      }

      const newAccount = await response.json();
      return newAccount;
    } catch (error) {
      console.error('Error creating account:', error);
      throw error;
    }
  }

  /**
   * Update an existing account
   * @param {number} id - The account ID to update
   * @param {Object} updates - The fields to update
   * @returns {Promise<Object>} The updated account
   * @throws {Error} If update fails
   */
  async function updateAccount(id, updates) {
    try {
      const response = await fetchWithAuth(`/api/accounts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update account');
      }

      const updatedAccount = await response.json();
      return updatedAccount;
    } catch (error) {
      console.error('Error updating account:', error);
      throw error;
    }
  }

  /**
   * Delete an account
   * @param {number} id - The account ID to delete
   * @throws {Error} If deletion fails
   */
  async function deleteAccount(id) {
    try {
      const response = await fetchWithAuth(`/api/accounts/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok && response.status !== 204) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete account');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  }

  /**
   * Fetch account balance up to a specific date
   * @param {number} id - The account ID
   * @param {string} upToDate - The date to calculate balance up to (YYYY-MM-DD)
   * @returns {Promise<Object>} The account balance information
   * @throws {Error} If fetch fails
   */
  async function fetchAccountBalance(id, upToDate) {
    try {
      const response = await fetchWithAuth(`/api/accounts/${id}/balance?up_to_date=${upToDate}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching account balance:', error);
      throw error;
    }
  }

  return {
    // Actions
    fetchAccountById,
    createAccount,
    updateAccount,
    deleteAccount,
    fetchAccountBalance,
  };
});
