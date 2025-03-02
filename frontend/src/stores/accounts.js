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
  async function fetchAccounts() {
    try {
      const response = await fetchWithAuth('/api/accounts');
      const data = await response.json();
      accounts.value = data;
    } catch (error) {
      console.error('Error fetching accounts:', error);
      throw error;
    }
  }

  async function addAccount(account) {
    try {
      const response = await fetchWithAuth('/api/accounts', {
        method: 'POST',
        body: JSON.stringify(account),
      });
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
      await fetchWithAuth(`/api/accounts/${id}`, {
        method: 'DELETE',
      });
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
  };
});
