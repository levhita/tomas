import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

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
      const response = await fetch('/api/accounts');
      const data = await response.json();
      accounts.value = data;
    } catch (error) {
      console.error('Error fetching accounts:', error);
      throw error;
    }
  }

  async function addAccount(account) {
    try {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      const response = await fetch(`/api/accounts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
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
      await fetch(`/api/accounts/${id}`, {
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
  };
});
