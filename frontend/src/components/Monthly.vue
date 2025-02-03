<template>
  <div class="monthly-report">
    <div class="controls">
      <select v-model="selectedAccount" @change="fetchReport">
        <option v-for="account in accounts" :key="account.id" :value="account.id">
          {{ account.name }}
        </option>
      </select>

      <div class="month-nav">
        <button @click="previousMonth">&lt;</button>
        <span>{{ currentMonth }}</span>
        <button @click="nextMonth">&gt;</button>
      </div>
    </div>

    <div v-if="isLoading" class="loading">Loading...</div>

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
        <div class="total-item">
          <h3>Pending</h3>
          <span>{{ formatCurrency(report.total_projected - report.total_exercised) }}</span>
        </div>
      </div>

      <div class="transactions">
        <div v-for="transaction in report.transactions" :key="transaction.id" class="transaction-item">
          <div class="transaction-date">{{ formatDate(transaction.date) }}</div>
          <div class="transaction-desc">{{ transaction.description }}</div>
          <div class="transaction-amount">{{ formatCurrency(transaction.amount) }}</div>
          <div class="transaction-status">
            <input type="checkbox" v-model="transaction.exercised">
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue';
import moment from 'moment';
import { useReportsStore } from '../stores/reports';
import { useAccountsStore } from '../stores/accounts';

export default defineComponent({
  name: 'MonthlyComponent',
  setup() {
    const reportsStore = useReportsStore();
    const accountsStore = useAccountsStore();
    return { reportsStore, accountsStore };
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
      return this.reportsStore.monthlyReport;
    },
    accounts() {
      return this.accountsStore.accounts;
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
    },
    previousMonth() {
      this.currentDate = this.currentDate.subtract(1, 'month');
      this.fetchReport();
    },
    nextMonth() {
      this.currentDate = this.currentDate.add(1, 'month');
      this.fetchReport();
    }
  },
  async mounted() {
    await this.accountsStore.fetchAccounts();
    if (this.accounts.length > 0) {
      this.selectedAccount = this.accounts[0].id;
      await this.fetchReport();
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