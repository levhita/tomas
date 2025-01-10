<template>
  <div>
    <FullCalendar :options="calendarOptions" />

    <!-- Transaction Creation/Edition Dialog -->
    <div v-if="showTransactionDialog" class="transaction-dialog">
      <div class="dialog-content">
        <div class="row">
          <div class="col-10">
            <h3>{{ isEditing ? 'Edit' : 'Create New' }} Transaction</h3>
          </div>
          <div class="col-2 text-end">
            <button type="button" class="btn-close" aria-label="Close" @click="closeDialog"></button>
          </div>
        </div>
        <!-- Main fields -->
        <form v-on:submit.prevent>
          <div class="form-floating mb-3">
            <input id="transactionInput" ref="transactionInput" v-model="currentTransaction.description"
              class="form-control" placeholder="Groceries, Rent, etc." @keypress.enter="saveTransaction" />
            <label for="transactionInput" class="form-label">Description</label>
          </div>

          <div class="form-floating mb-3">
            <input id="amountInput" type="number" class="form-control" v-model.number="currentTransaction.amount"
              placeholder="0.00" @keypress.enter="saveTransaction" />
            <label for="amountInput" class="form-label">Amount</label>
          </div>

          <div class="row mb-3">
            <div class="col-6">
              <div class="form-floating">
                <select id="accountSelect" class="form-control" v-model="currentTransaction.account_id" required>
                  <option value="">Select Account</option>
                  <option v-for="account in accountsStore.accountsByName" :key="account.id" :value="account.id">
                    {{ account.name }}
                  </option>
                </select>
                <label for="accountSelect">Account</label>
              </div>
            </div>
            <div class="col-6">
              <div class="form-floating">
                <select id="categorySelect" class="form-control" v-model="currentTransaction.category_id" required>
                  <option value="">Select Category</option>
                  <option v-for="category in categoriesStore.categoriesByName" :key="category.id" :value="category.id">
                    {{ category.name }}
                  </option>
                </select>
                <label for="categorySelect">Category</label>
              </div>
            </div>
          </div>

          <div class="form-floating mb-3">
            <input id="dateInput" type="date" class="form-control" v-model="currentTransaction.date" required />
            <label for="dateInput" class="form-label">Date</label>
          </div>

          <div class="form-check mb-3">
            <input type="checkbox" class="form-check-input" v-model="currentTransaction.exercised" />
            <label class="form-check-label"> Transaction already exercised</label>
          </div>

          <div class="form-floating mb-3">
            <textarea id="noteTextarea" class="form-control" v-model="currentTransaction.note"
              placeholder="Additional details..." :style="{ 'min-height': '6rem' }"></textarea>
            <label for="noteTextarea">Note</label>
          </div>
        </form>

        <div class="row">
          <div class="col-6">
            <button class="btn btn-outline-danger" v-if="isEditing" @click="confirmDelete">
              <i class="bi bi-trash"></i> Delete
            </button>
          </div>
          <div class="col-6 text-end">
            <button class="btn btn-outline-secondary me-3" @click="closeDialog">Cancel</button>
            <button class="btn btn-primary" @click="saveTransaction">{{ isEditing ? 'Update' : 'Save' }}</button>
          </div>
        </div>

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
  min-width: 600px;
}

.fc-event {
  cursor: move;
}

.fc-event.fc-event-dragging {
  opacity: 0.7;
}
</style>