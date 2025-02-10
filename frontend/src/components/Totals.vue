<template>
  <div v-if="isLoading" class="text-center p-4">
    <div class="spinner-border text-primary" role="status">
      <span class="visually-hidden">Loading...</span>
    </div>
  </div>
  <div v-else class="report-content">
    <h3>{{ props.account?.name }} ({{ props.account?.type }})</h3>
    <table class="table">
      <thead>
        <tr>
          <th>Description</th>
          <th>Exercised</th>
          <th>Projected</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th>{{ incomeString }}</th>
          <td class="text-end">{{ formatCurrency(totals.income_exercised) }}</td>
          <td class="text-end">{{ formatCurrency(totals.income_projected) }}</td>
        </tr>
        <tr>
          <th>{{ outcomeString }}</th>
          <td class="text-end">{{ formatCurrency(totals.outcome_exercised) }}</td>
          <td class="text-end">{{ formatCurrency(totals.outcome_projected) }}</td>
        </tr>
        <tr>
          <th>Totals</th>
          <td class="text-end">{{ formatCurrency(totals.exercised) }}</td>
          <td class="text-end">{{ formatCurrency(totals.projected) }}</td>
        </tr>
      </tbody>
    </table>

    <h4>Transactions</h4>
    <table class="transactions table">
      <thead class="thead-dark">
        <tr>
          <th class="text-start">Description</th>
          <th class="text-end">Date</th>
          <th class="text-end">Amount</th>
          <th class="text-end">Exercised</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="transaction in rangeTransactions" :key="transaction.id">
          <td>
            <span class="description-button"
              @click="$emit('edit-transaction', { transaction, editing: true, focusOn: 'description' })">
              {{ transaction.description }}
            </span>
          </td>
          <td class="text-end text-nowrap">{{ moment(transaction.date).date() }}</td>
          <td class="text-end text-nowrap ps-2">
            <span class="amount-button"
              @click="$emit('edit-transaction', { transaction, editing: true, focusOn: 'amount' })">
              {{ formatCurrency(transaction.amount) }}
            </span>
          </td>
          <td class="text-center">
            <span class="exercised-toggle" @click="toggleExercised(transaction)">
              {{ transaction.exercised ? 'Yes' : 'No' }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useTransactionsStore } from '../stores/transactions'
import moment from 'moment'

const props = defineProps({
  account: Object,
  startDate: String,
  endDate: String
})

const emit = defineEmits(['edit-transaction'])

const transactionsStore = useTransactionsStore()
const isLoading = ref(false)

const rangeTransactions = computed(() => {
  const rangeTransactions = transactionsStore.transactionsByDate.filter(t => {
    const date = moment(t.date) // do we really need moment, dates are garanted to be in ISO format
    return t.account_id === props.account.id &&
      date.isBetween(props.startDate, props.endDate, 'day', '[]')
  })
  return rangeTransactions;
})

const incomeTransactions = computed(() =>
  rangeTransactions.value.filter(t => t.amount >= 0)
)

const outcomeTransactions = computed(() =>
  rangeTransactions.value.filter(t => t.amount < 0)
)

const totals = computed(() => ({
  income_projected: sum(incomeTransactions.value),
  income_exercised: sum(incomeTransactions.value.filter(t => t.exercised)),
  outcome_projected: sum(outcomeTransactions.value),
  outcome_exercised: sum(outcomeTransactions.value.filter(t => t.exercised)),
  projected: sum(rangeTransactions.value),
  exercised: sum(rangeTransactions.value.filter(t => t.exercised))
}))

const incomeString = computed(() => props.account?.type === 'credit' ? 'Charge' : 'Income');
const outcomeString = computed(() => props.account?.type === 'credit' ? 'Payment' : 'Expense');
function sum(transactions) {
  return transactions.reduce((total, t) => total + t.amount, 0)
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

async function toggleExercised(transaction) {
  try {
    await transactionsStore.updateTransaction(transaction.id, {
      ...transaction,
      exercised: !transaction.exercised
    })
  } catch (error) {
    console.error('Failed to toggle exercised:', error)
  }
}
</script>

<style scoped>
.exercised-toggle,
.description-button,
.amount-button:hover {
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
}

.exercised-toggle:hover,
.description-button:hover,
.amount-button:hover {
  background-color: rgba(0, 0, 0, 0.05);
}
</style>