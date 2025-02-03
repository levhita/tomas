<template>
  <div>
    <FullCalendar :options="calendarOptions" />

    <!-- Transaction Creation/Edition Dialog -->
    <div v-if="showTransactionDialog" class="transaction-dialog">
      <div class="dialog-content">
        <h3>{{ isEditing ? 'Edit' : 'Create New' }} Transaction</h3>

        <!-- Main fields -->
        <form @submit.prevent="handleSubmit">
          <div class="form-group">
            <label for="transactionInput">Description</label>
            <input ref="transactionInput" v-model="currentTransaction.description" placeholder="Groceries, Rent, etc."
              @keypress.enter="saveTransaction" />
          </div>

          <div class="form-group">
            <label for="amountInput">Amount</label>
            <input id="amountInput" type="number" v-model.number="currentTransaction.amount" placeholder="0.00"
              step="0.01" min="0" @keypress.enter="saveTransaction" />
          </div>

          <!-- Additional fields in details -->
          <details open class="transaction-details">
            <summary>Additional Details</summary>

            <div class="form-group">
              <label for="dateInput">Date</label>
              <input id="dateInput" type="date" v-model="currentTransaction.date" required />
            </div>

            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="currentTransaction.exercised" />
                Transaction already exercised
              </label>
            </div>

            <div class="form-group">
              <label for="categorySelect">Category</label>
              <CategorySelect v-model="currentTransaction.category_id" />
            </div>

            <div class="form-group">
              <label for="accountSelect">Account</label>
              <select id="accountSelect" v-model="currentTransaction.account_id" required>
                <option value="">Select Account</option>
                <option v-for="account in accountsStore.accountsByName" :key="account.id" :value="account.id">
                  {{ account.name }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label for="noteTextarea">Note</label>
              <textarea id="noteTextarea" v-model="currentTransaction.note" placeholder="Additional details..."
                rows="3"></textarea>
            </div>
          </details>

          <div class="button-group">
            <button @click="saveTransaction">{{ isEditing ? 'Update' : 'Save' }}</button>
            <button v-if="isEditing" @click="confirmDelete" class="delete-button">
              Delete
            </button>
            <button @click="closeDialog">Cancel</button>
          </div>
        </form>
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
import $moment from 'moment';
import CategorySelect from './inputs/CategorySelect.vue'

export default defineComponent({
  name: 'CalendarComponent',
  components: {
    FullCalendar,
    CategorySelect,
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
      isEditing: false,
      currentTransaction: {
        id: null,
        description: '',
        amount: null,
        date: null,
        category_id: '',
        account_id: '',
        isExpense: true,
        exercised: false,
        note: ''
      }
    };
  },
  computed: {
    currentDate() {
      return $moment().format('YYYY-MM-DD');
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
        editable: true, // Enable drag-and-drop
        eventDrop: this.handleEventDrop, // Add drop handler
        events,
        headerToolbar: {
          left: 'prev,next',
          center: 'title',
          right: 'dayGridWeek,dayGridMonth' // user can switch between the two
        },
        eventContent: (arg) => {
          return { html: arg.event.title }
        },
        eventClick: this.handleEventClick
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
      this.isEditing = false;
      this.currentTransaction.date = arg.dateStr;
      console.log(this.currentTransaction.date);
      if (this.currentTransaction.date <= this.currentDate) {
        this.currentTransaction.exercised = true;
      }
      this.showTransactionDialog = true;
    },
    handleEventClick(info) {
      const transaction = this.transactionsStore.getTransactionById(parseInt(info.event.id));

      if (transaction) {
        this.isEditing = true;
        this.currentTransaction = { ...transaction };
        this.showTransactionDialog = true;
        this.$nextTick(() => {
          this.$refs.transactionInput?.focus();
        });
      }
    },
    async handleEventDrop(info) {
      try {
        const transaction = this.transactionsStore.getTransactionById(parseInt(info.event.id));
        if (transaction) {
          await this.transactionsStore.updateTransaction(transaction.id, {
            ...transaction,
            date: info.event.startStr
          });
        }
      } catch (error) {
        console.error('Failed to update transaction date:', error);
        info.revert(); // Revert the drag if update fails
      }
    },
    async saveTransaction() {
      if (this.validateForm()) {
        if (this.isEditing) {
          await this.transactionsStore.updateTransaction(
            this.currentTransaction.id,
            this.currentTransaction
          );
        } else {
          await this.transactionsStore.addTransaction(this.currentTransaction);
        }
        this.closeDialog();
      }
    },
    validateForm() {
      return (
        this.currentTransaction.description &&
        this.currentTransaction.amount &&
        this.currentTransaction.category_id &&
        this.currentTransaction.account_id &&
        this.currentTransaction.date
      );
    },
    closeDialog() {
      this.showTransactionDialog = false;
      this.isEditing = false;
      this.resetForm();
    },
    resetForm() {
      this.currentTransaction = {
        id: null,
        description: '',
        amount: null,
        date: null,
        category_id: '',
        account_id: '',
        isExpense: true,
        exercised: false,
        note: ''
      };
    },
    async confirmDelete() {
      if (confirm('Are you sure you want to delete this transaction?')) {
        await this.deleteTransaction();
      }
    },

    async deleteTransaction() {
      try {
        await this.transactionsStore.deleteTransaction(this.currentTransaction.id);
        this.closeDialog();
      } catch (error) {
        console.error('Failed to delete transaction:', error);
      }
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
  padding: 12px 0px;
  /*border: 1px solid #ddd;*/
  border-radius: 4px;
}

.transaction-details summary {
  cursor: pointer;
  padding: 4px;
  font-weight: 500;
  margin-bottom: 8px;
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

.button-group {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

button {
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.delete-button {
  background-color: #dc3545;
  color: white;
  border: none;
}

.delete-button:hover {
  background-color: #c82333;
}

textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
}

textarea:focus {
  outline: none;
  border-color: #0066cc;
}

input[type="date"] {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-top: 4px;
}

input[type="date"]::-webkit-calendar-picker-indicator {
  cursor: pointer;
}

.fc-event {
  cursor: move;
}

.fc-event.fc-event-dragging {
  opacity: 0.7;
}
</style>