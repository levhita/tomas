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
// import { mapActions, mapGetters } from 'vuex';
import FullCalendar from '@fullcalendar/vue3';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

export default defineComponent({
  name: 'CalendarComponent',
  components: {
    FullCalendar,
  },
  computed: {
    ...mapGetters(['transactions']),
    currentDate() {
      return new Date().toISOString().split('T')[0];
    },
    calendarOptions() {
      const events = this.transactions.map(transaction => ({
        title: `
          <div class="event-title">
            <div class="event-description">${transaction.description}</div>
            <div class="event-amount">${this.formatAmount(transaction.amount, transaction.isExpense)}</div>
          </div>
        `,
        date: transaction.date,
        html: true
      }));
      
      return {
        plugins: [dayGridPlugin, interactionPlugin],
        initialView: 'dayGridMonth',
        dateClick: this.handleDateClick,
        events: events,
        headerToolbar: {
          left: 'prev,next',
          center: 'title',
          right: 'dayGridWeek,dayGridMonth' // user can switch between the two
        },
        eventContent: (arg) => {
          return { html: arg.event.title }
        }
      }
    }
  },
  methods: {
    ...mapActions(['addTransaction', 'setTransactions']),
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
    saveTransaction() {
      console.log(this.newTransaction);
      if (this.newTransaction.description) {
        this.addTransaction({
          description: this.newTransaction.description,
          amount: this.newTransaction.amount,
          date: this.newTransaction.date,
          isExpense: this.newTransaction.isExpense,
          exercised: this.newTransaction.exercised
        });
        this.newTransaction.description = '';
        this.showTransactionDialog = false;
      }
    }
  },
  data() {
    return {
      showTransactionDialog: false,
      newTransaction: {
        description: '',
        amount: null,
        date: null,
        isExpense: true,
        exercised: false
      }
    };
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
</style>