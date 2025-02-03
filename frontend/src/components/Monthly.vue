<template>
  <div class="card">
    <div class="card-body">
      <div v-if="isLoading" class="text-center p-4">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>
      <div v-else-if="report" class="report-content">
        <div class="totals">
          <div class="total-item">
            <h3>Projected</h3>
            <span>{{ formatCurrency(report.total_projected) }}</span>
          </div>
          <div class="total-item">
            <h3>Exercised</h3>
            <span>{{ formatCurrency(report.total_exercised) }}</span>
          </div>
        </div>

        <div class="transactions">
          <div v-for="transaction in report.transactions" :key="transaction.id" class="transaction-item">
            <div class="transaction-date">{{ formatDate(transaction.date) }}</div>
            <div class="transaction-desc">{{ transaction.description }}</div>
            <div class="transaction-amount">{{ formatCurrency(transaction.amount) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>






<script>
import { watch, defineComponent } from 'vue';
import { useReportsStore } from '../stores/reports';
import moment from 'moment';


export default defineComponent({
  name: 'MonthlyComponent',
  setup() {
    const reportsStore = useReportsStore();
    return { reportsStore };
  },
  props: {
    accountId: Number,
    currentDate: Object
  },
  data() {
    return {
      selectedAccount: null,
      currentDate: moment(),
      isLoading: false
    };
  },
  computed: {
    currentMonth() {
      return this.currentDate.format('MMMM YYYY');
    },
    report() {
      console.log(this);
      return this.reportsStore.monthlyReport;
    }
  },
  watch: {
    accountId(newAccountId) {
      this.selectedAccount = newAccountId;
      this.fetchReport();
    },
    currentDate(newDate) {
      this.currentDate = newDate;
      this.fetchReport();
    }
  },
  methods: {
    formatCurrency(amount) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    },
    formatDate(date) {
      return moment(date).format('MMM D');
    },
    async fetchReport() {
      if (!this.selectedAccount) return;
      this.isLoading = true;
      try {
        await this.reportsStore.fetchMonthlyReport(
          this.selectedAccount,
          this.currentDate.format('YYYY-MM-DD')
        );
      } finally {
        this.isLoading = false;
      }
    }
  },
  async mounted() {
    if (this.selectedAccount) {
      await fetchReport();
    }
  }
});
</script>

<style scoped>
.monthly-report {
  padding: 20px;
}

.controls {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.month-nav {
  display: flex;
  align-items: center;
  gap: 10px;
}

.totals {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 30px;
}

.transaction-item {
  display: grid;
  grid-template-columns: 100px 1fr auto 50px;
  padding: 10px;
  border-bottom: 1px solid #eee;
}
</style>