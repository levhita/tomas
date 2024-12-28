<template>
  <div>
    <FullCalendar :options="calendarOptions" />
    
    <!-- Transaction Creation Dialog -->
    <div v-if="showTransactionDialog" class="transaction-dialog">
      <div class="dialog-content">
        <h3>Create New Transaction</h3>
        <input v-model="newTransaction.title" placeholder="New Transaction" />
        <button @click="saveTransaction">Save</button>
        <button @click="showTransactionDialog=false">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue';
import { mapActions, mapGetters } from 'vuex';
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
  },
  methods: {
    ...mapActions(['addTransaction', 'setTransactions']),
    handleDateClick(arg) {
      this.newTransaction.date = arg.dateStr;
      this.showTransactionDialog = true;
    },
    saveTransaction() {
      console.log(this.transactions);
      if (this.newTransaction.title) {
        this.addTransaction({
          title: this.newTransaction.title,
          date: this.newTransaction.date
        });
        this.newTransaction.title = '';
        this.showTransactionDialog = false;
      }
    }
  },
  data() {
    return {
      showTransactionDialog: false,
      newTransaction: {
        title: '',
        date: null
      },
      calendarOptions: {
        plugins: [dayGridPlugin, interactionPlugin],
        initialView: 'dayGridMonth',
        dateClick: this.handleDateClick,
        events: this.transactions,
        headerToolbar: {
          left: 'prev,next',
          center: 'title',
          right: 'dayGridWeek,dayGridMonth' // user can switch between the two
        }
      }
    };
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
</style>