<template>
  <div>
    <FullCalendar :options="calendarOptions" />
    
    <!-- Transaction Creation Dialog -->
    <div v-if="showTransactionDialog" class="transaction-dialog">
      <div class="dialog-content">
        <h3>Create New Transaction</h3>
        
        <div class="form-group">
          <label for="transactionInput">Description</label>
          <input 
          ref="transactionInput"
          v-model="newTransaction.description" 
          placeholder="Groceries, Rent, etc."
          @keypress.enter="saveTransaction"
          />
        </div>
        <div class="form-group">
          <label for="amountInput">Amount</label>
          <input 
          id="amountInput"
          type="number"
          v-model.number="newTransaction.amount"
          placeholder="0.00"
          step="0.01"
          min="0"
          @keypress.enter="saveTransaction"
          />
        </div>
        
        <div class="form-group">
          <label for="categorySelect">Category</label>
          <select 
            id="categorySelect"
            v-model="newTransaction.category_id"
            required
          >
            <option value="">Select Category</option>
            <option 
              v-for="category in categoriesStore.categoriesByName" 
              :key="category.id"
              :value="category.id"
            >
              {{ category.name }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label for="accountSelect">Account</label>
          <select 
            id="accountSelect"
            v-model="newTransaction.account_id"
            required
          >
            <option value="">Select Account</option>
            <option 
              v-for="account in accountsStore.accountsByName" 
              :key="account.id"
              :value="account.id"
            >
              {{ account.name }}
            </option>
          </select>
        </div>

        <details class="transaction-details" open>
          <div class="form-group">
            <label>Transaction Type</label>
            <div class="radio-group">
              <label class="radio-label">
                <input
                type="radio"
                v-model="newTransaction.isExpense"
                :value="true"
                name="transactionType"
                />
                Expense
              </label>
              <label class="radio-label">
                <input
                type="radio"
                v-model="newTransaction.isExpense"
                :value="false"
                name="transactionType"
                />
                Income
              </label>
            </div>
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input
              ref="transactionExcercised"
              type="checkbox"
              v-model="newTransaction.exercised"
              />
              Exercised (Amount already entered/exited the account)
            </label>
          </div>
        </details>
        <button @click="saveTransaction">Save</button>
        <button @click="showTransactionDialog=false">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue';
import { useTransactionsStore } from '../stores/transactions';
import { useCategoriesStore } from '../stores/categories';
import { useAccountsStore } from '../stores/accounts';
import FullCalendar from '@fullcalendar/vue3';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

export default defineComponent({
  name: 'CalendarComponent',
  components: {
    FullCalendar,
  },
  setup() {
    const transactionsStore = useTransactionsStore();
    const categoriesStore = useCategoriesStore();
    const accountsStore = useAccountsStore();
    return { transactionsStore, categoriesStore, accountsStore };
  },
  data() {
    return {
      showTransactionDialog: false,
      newTransaction: {
        description: '',
        amount: null,
        date: null,
        isExpense: true,
        exercised: false,
        category_id: '',
        account_id: ''
      }
    };
  },
  computed: {
    currentDate() {
      return new Date().toISOString().split('T')[0];
    },
    calendarOptions() {
      const events = this.transactionsStore.transactionsByDate.map(transaction => ({
        id: transaction.id,
        title: `
          <div class="transaction-title">
            <div class="transaction-description">${transaction.description}</div>
            <div class="transaction-amount">${this.formatAmount(transaction.amount, transaction.isExpense)}</div>
          </div>
        `,
        date: transaction.date,
        html: true
      }));
      
      return {
        plugins: [dayGridPlugin, interactionPlugin],
        initialView: 'dayGridMonth',
        dateClick: this.handleDateClick,
        events,
        headerToolbar: {
          left: 'prev,next',
          center: 'title',
          right: 'dayGridWeek,dayGridMonth' // user can switch between the two
        },
        eventContent: (arg) => {
          return { html: arg.event.title }
        }
      };
    }
  },
  methods: {
    formatAmount(amount, isExpense) {
      if (isExpense) { amount = -amount };
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'EUR', //TODO: Change to user's currency
        currencyDisplay: "narrowSymbol"
      }).format(amount);
    },
    handleDateClick(arg) {
      this.newTransaction.date = arg.dateStr;
      if (arg.dateStr<=this.currentDate) {
        this.newTransaction.exercised = true;
      } else {
        this.newTransaction.exercised = false;
      }
      this.showTransactionDialog = true;
      console.log(this.transactions)
    },
    async saveTransaction() {
      if (this.newTransaction.description && 
          this.newTransaction.amount &&
          this.newTransaction.category_id &&
          this.newTransaction.account_id) {
        await this.transactionsStore.addTransaction(this.newTransaction);
        this.resetForm();
        this.showTransactionDialog = false;
      }
    },
    
    resetForm() {
      this.newTransaction = {
        description: '',
        amount: null,
        date: null,
        isExpense: true,
        exercised: false,
        category_id: '',
        account_id: ''
      };
    }
  },
  async mounted() {
    await Promise.all([
      this.transactionsStore.fetchTransactions(),
      this.categoriesStore.fetchCategories(),
      this.accountsStore.fetchAccounts()
    ]);
  },
  watch: {
    showTransactionDialog(newValue) {
      if (newValue) {
        // Use nextTick to ensure DOM is updated
        this.$nextTick(() => {
          this.$refs.transactionInput.focus();
        });
      }
    }
  }
});
</script>

<style scoped>

.radio-group {
  display: flex;
  gap: 16px;
  margin: 8px 0;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}
.transaction-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2;
}

.dialog-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  min-width: 300px;
}

input {
  width: 100%;
  margin: 10px 0;
  padding: 8px;
}

button {
  margin: 5px;
  padding: 8px 16px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
}

.transaction-details {
  margin: 16px 0;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.transaction-details summary {
  cursor: pointer;
  padding: 4px;
  font-weight: 500;
}

.transaction-details .form-group {
  margin-top: 12px;
}

select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-top: 4px;
}

.form-group {
  margin-bottom: 16px;
}
</style>