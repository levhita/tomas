import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import fetchWithAuth from '../utils/fetch';

export const useAccountsStore = defineStore('accounts', () => {
  // State
  const accounts = ref([]);

  // Getters
  const accountsByName = computed(() => {
    return accounts.value.sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  });

  const getAccountById = computed(() => {
    return (id) => accounts.value.find(a => a.id === id);
  });

  const totalBalance = computed(() => {
    return accounts.value.reduce((sum, account) => {
      return sum + (account.type === 'debit' ? account.starting_amount : -account.starting_amount);
    }, 0);
  });

  // Actions
  async function fetchAccounts(bookId) {
    try {
      // Check if bookId is provided
      if (!bookId) {
        console.error('fetchAccounts: bookId is required');
        throw new Error('Book ID is required to fetch accounts');
      }

      // Fetch accounts for the specified book
      const response = await fetchWithAuth(`/api/accounts?book_id=${bookId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch accounts');
      }

      const data = await response.json();
      accounts.value = data;
      return data;
    } catch (error) {
      console.error('Error fetching accounts:', error);
      throw error;
    }
  }

  async function addAccount(account) {
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
        throw new Error(errorData.error || 'Failed to add account');
      }

      const newAccount = await response.json();
      accounts.value.push(newAccount);
      return newAccount;
    } catch (error) {
      console.error('Error adding account:', error);
      throw error;
    }
  }

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
      const index = accounts.value.findIndex(a => a.id === id);
      if (index !== -1) {
        accounts.value[index] = updatedAccount;
      }
      return updatedAccount;
    } catch (error) {
      console.error('Error updating account:', error);
      throw error;
    }
  }

  async function deleteAccount(id) {
    try {
      const response = await fetchWithAuth(`/api/accounts/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok && response.status !== 204) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete account');
      }

      const index = accounts.value.findIndex(a => a.id === id);
      if (index !== -1) {
        accounts.value.splice(index, 1);
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  }

  async function fetchAccountBalance(id, upToDate) {
    try {
      const response = await fetchWithAuth(`/api/accounts/${id}/balance?upToDate=${upToDate}`);
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

  // Add this function to the store
  function resetState() {
    accounts.value = [];
  }

  return {
    // State
    accounts,
    // Getters
    accountsByName,
    getAccountById,
    totalBalance,
    // Actions
    fetchAccounts,
    addAccount,
    updateAccount,
    deleteAccount,
    fetchAccountBalance,
    // New action
    resetState,
  };
});
