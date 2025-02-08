<template>
  <div class="card">
    <div class="card-body">
      <div v-if="isLoading" class="text-center p-4">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>
      <div v-else class="report-content">
        <div class="totals">
          <div class="total-item">
            <h3>Projected</h3>
            <span>{{ formatCurrency(totals.projected) }}</span>
          </div>
          <div class="total-item">
            <h3>Exercised</h3>
            <span>{{ formatCurrency(totals.exercised) }}</span>
          </div>
        </div>

        <div class="transactions">
          <div v-for="transaction in rangeTransactions" :key="transaction.id" class="transaction-item">
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
import { ref, computed } from 'vue'
import { useTransactionsStore } from '../stores/transactions'
import moment from 'moment'

const props = defineProps({
  accountId: Number,
  startDate: String,
  endDate: String
})

const transactionsStore = useTransactionsStore()
const isLoading = ref(false)

const rangeTransactions = computed(() => {
  return transactionsStore.transactions.filter(t => {
    const date = moment(t.date)
    console.log({ accountId: props.accountId, startDate: props.startDate, endDate: props.endDate })
    return t.account_id === props.accountId &&
      date.isBetween(props.startDate, props.endDate, 'day', '[]')
  })
})

const totals = computed(() => ({
  projected: rangeTransactions.value.reduce((sum, t) => sum + t.amount, 0),
  exercised: rangeTransactions.value.reduce((sum, t) => t.exercised ? sum + t.amount : sum, 0)
}))

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function formatDate(date) {
  return moment(date).format('MMM D')
}
</script>

<style scoped></style>