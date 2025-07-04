import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import fetchWithAuth from '../utils/fetch';

export const useTransactionsStore = defineStore('transactions', () => {
  // State
  const transactions = ref([]);

  // Getters
  const transactionsByDate = computed(() => {
    return [...transactions.value].sort((a, b) => {
      return new Date(a.date) - new Date(b.date)
    })
  })

  // Reset state method to clear transactions when switching workspaces
  function resetState() {
    transactions.value = [];
  }

  // Actions
  async function fetchTransactions(accountId, startDate, endDate) {
    try {
      const params = new URLSearchParams();
      if (accountId) params.append('accountId', accountId);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const url = `/api/transactions${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetchWithAuth(url);
      const data = await response.json();
      transactions.value = data;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  }

  async function fetchTransactionById(id) {
    try {
      const response = await fetchWithAuth(`/api/transactions/${id}`);
      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error);
      }
      const transaction = await response.json();

      // Update transaction in local state if exists
      const index = transactions.value.findIndex(t => t.id === id);
      if (index !== -1) {
        transactions.value[index] = transaction;
      } else {
        transactions.value.push(transaction);
      }

      return transaction;
    } catch (error) {
      console.error('Error fetching transaction:', error);
      throw error;
    }
  }
  
async function fetchTransactionsByWorkspace(workspaceId, { page = 1, limit = 20, sortKey = 'date', sortDirection = 'desc' } = {}) {
  try {
    const params = new URLSearchParams({ page, limit, sortKey, sortDirection });
    if (!workspaceId) throw new Error('workspaceId is required');
    const url = `/api/transactions/${workspaceId}/all?${params.toString()}`;
    const response = await fetchWithAuth(url);
    if (!response.ok) {
      const json = await response.json();
      throw new Error(json.error);
    }
    const data = await response.json();
    transactions.value = data.transactions;
    return { transactions: data.transactions, total: data.total };
  } catch (error) {
    console.error('Error fetching transactions by workspace:', error);
    throw error;
  }
}

  async function addTransaction(transaction) {
    try {
      const response = await fetchWithAuth('/api/transactions', {
        method: 'POST',
        body: JSON.stringify(transaction),
      });
      const newTransaction = await response.json();
      transactions.value.push(newTransaction);
      return newTransaction;
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  }

  async function updateTransaction(id, updates) {
    try {
      const response = await fetchWithAuth(`/api/transactions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      const updatedTransaction = await response.json();
      const index = transactions.value.findIndex(t => t.id === id);
      if (index !== -1) {
        transactions.value[index] = updatedTransaction;
      }
      return updatedTransaction;
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  }

  async function deleteTransaction(id) {
    try {
      const response = await fetchWithAuth(`/api/transactions/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const json = await response.json()
        throw new Error(json.error);
      }

      const index = transactions.value.findIndex(t => t.id === id);
      if (index !== -1) {
        transactions.value.splice(index, 1);
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  }

  return {
    // State
    transactions,
    // Getters
    transactionsByDate,
    // Reset method
    resetState,
    // Actions
    fetchTransactions,
    fetchTransactionById,
    fetchTransactionsByWorkspace,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  };
});
