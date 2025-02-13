<template>
  <div v-if="isLoading" class="text-center p-4">
    <div class="spinner-border text-primary" role="status">
      <span class="visually-hidden">Loading...</span>
    </div>
  </div>
  <div v-else class="report-content">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h3>{{ props.account?.name }} ({{ props.account?.type }})</h3>
      <div class="form-check form-switch">
        <input class="form-check-input" type="checkbox" id="includeBalanceSwitch" v-model="includePreviousBalance">
        <label class="form-check-label" for="includeBalanceSwitch">
          Include Previous Balance
        </label>
      </div>
    </div>
    <table class="table">
      <thead>
        <tr>
          <th></th>
          <th class="text-end">Projected</th>
          <th class="text-end">Exercised</th>
          <th class="text-end">Pending</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="showPreviousBalance">
          <th>Previous Balance</th>
          <td class="text-end text-nowrap">{{ formatCurrency(previousBalance.projected_balance) }}</td>
          <td class="text-end text-nowrap">{{ formatCurrency(previousBalance.exercised_balance) }}</td>
          <td class="text-end text-nowrap">
            {{ formatCurrency(previousBalance.projected_balance - previousBalance.exercised_balance) }}
          </td>
        </tr>
        <tr>
          <th>{{ incomeString }}</th>
          <td class="text-end text-nowrap">{{ formatCurrency(totals.income_projected) }}</td>
          <td class="text-end text-nowrap">{{ formatCurrency(totals.income_exercised) }}</td>
          <td class="text-end text-nowrap">{{ formatCurrency(totals.income_projected - totals.income_exercised) }}
          </td>
        </tr>
        <tr>
          <th>{{ outcomeString }}</th>
          <td class="text-end text-nowrap">{{ formatCurrency(totals.outcome_projected) }}</td>
          <td class="text-end text-nowrap">{{ formatCurrency(totals.outcome_exercised) }}</td>
          <td class="text-end text-nowrap">{{ formatCurrency(totals.outcome_projected - totals.outcome_exercised) }}
          </td>
        </tr>
        <tr>
          <th>Totals</th>
          <td class="text-end text-nowrap">{{ formatCurrency(totals.projected) }}</td>
          <td class="text-end text-nowrap">{{ formatCurrency(totals.exercised) }}</td>
          <td class="text-end text-nowrap">{{ formatCurrency(totals.projected - totals.exercised) }}</td>
        </tr>
      </tbody>
    </table>

    <h4>Transactions</h4>
    <table class="transactions table">
      <thead class="thead-dark">
        <tr>
          <th class="text-start">Description</th>
          <th class="text-end">Day</th>
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
import { ref, computed, watch } from 'vue'
import { useTransactionsStore } from '../stores/transactions'
import { useAccountsStore } from '../stores/accounts'
import moment from 'moment'

const props = defineProps({
  account: Object,
  startDate: String,
  endDate: String
})

const accountsStore = useAccountsStore()
const previousBalance = ref({})

// Add computed for previous month's end date
const previousMonthEnd = computed(() => {
  return moment(props.startDate).subtract(1, 'day').format('YYYY-MM-DD')
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

const includePreviousBalance = ref(true)

// Update totals computation to use the toggle
const totals = computed(() => {
  const baseProjectedBalance = includePreviousBalance.value ?
    (previousBalance.value?.projected_balance || 0) : 0

  const baseExercisedBalance = includePreviousBalance.value ?
    (previousBalance.value?.exercised_balance || 0) : 0
  return {
    income_projected: sum(incomeTransactions.value),
    income_exercised: sum(incomeTransactions.value.filter(t => t.exercised)),
    outcome_projected: sum(outcomeTransactions.value),
    outcome_exercised: sum(outcomeTransactions.value.filter(t => t.exercised)),
    projected: baseProjectedBalance + sum(rangeTransactions.value),
    exercised: baseExercisedBalance + sum(rangeTransactions.value.filter(t => t.exercised))
  }
})

// Update previous balance row visibility
const showPreviousBalance = computed(() =>
  includePreviousBalance.value && previousBalance.value?.exercised_balance !== undefined
)

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

// Fetch previous balance when account or dates change
watch(
  [() => props.account?.id, previousMonthEnd],
  async ([accountId, date]) => {
    if (accountId && date) {
      try {
        const balance = await accountsStore.fetchAccountBalance(accountId, date)
        previousBalance.value = balance;
      } catch (error) {
        console.error('Failed to fetch previous balance:', error)
      }
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.exercised-toggle,
.description-button,
.amount-button {
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
}

.exercised-toggle:hover,
.description-button:hover,
.amount-button:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.form-check-input {
  cursor: pointer;
}

.form-check-label {
  cursor: pointer;
  user-select: none;
}
</style>