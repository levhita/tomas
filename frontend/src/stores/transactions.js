import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useTransactionsStore = defineStore('transactions', () => {
  // State
  const transactions = ref([]);

  // Getters
  const transactionsByDate = computed(() => {
    return transactions.value.sort((a, b) =>
      new Date(b.date) - new Date(a.date)
    );
  });

  const getTransactionById = computed(() => {
    return (id) => transactions.value.find(t => t.id === id);
  });

  // Actions
  async function fetchTransactions(accountId, startDate, endDate) {
    try {
      const params = new URLSearchParams();
      if (accountId) params.append('accountId', accountId);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const url = `/api/transactions${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);
      const data = await response.json();
      transactions.value = data;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  }

  async function addTransaction(transaction) {
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
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
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
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
    getTransactionById,
    // Actions
    fetchTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  };
});
