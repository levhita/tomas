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

<script setup>
import { ref, watch } from 'vue'
import { useReportsStore } from '../stores/reports'
import moment from 'moment'

const props = defineProps({
  accountId: Number,
  selectedDate: String
})

const reportsStore = useReportsStore()
const isLoading = ref(false)
const report = ref(null)

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function formatDate(date) {
  return moment(date).format('MMM D')
}

async function fetchReport() {
  if (!props.accountId) return
  isLoading.value = true
  try {
    const data = await reportsStore.fetchMonthlyReport(props.accountId, props.selectedDate)
    report.value = data;
  } catch (error) {
    console.error('Failed to fetch report:', error)
  } finally {
    isLoading.value = false
  }
}

watch([() => props.accountId, () => props.selectedDate], fetchReport)
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