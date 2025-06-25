<template>
  <div v-if="isLoading" class="text-center p-4">
    <div class="spinner-border text-primary" role="status">
      <span class="visually-hidden">Loading...</span>
    </div>
  </div>
  <div v-else class="report-content p-2">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h3>{{ props.account?.name }} ({{ props.account?.type }})</h3>
      <div class="form-check form-switch">
        <input class="form-check-input" type="checkbox" id="includeBalanceSwitch" v-model="includePreviousBalance">
        <label class="form-check-label" for="includeBalanceSwitch">
          Roll Balance
        </label>
      </div>
    </div>
    <table class="table">
      <thead>
        <tr>
          <th>/</th>
          <th class="text-end">Projected</th>
          <th class="text-end">Exercised</th>
          <th class="text-end">Pending</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="showPreviousBalance">
          <th>Previous Balance</th>
          <td class="text-end text-nowrap">{{ formatAmount(previousBalance.projected_balance) }}</td>
          <td class="text-end text-nowrap">{{ formatAmount(previousBalance.exercised_balance) }}</td>
          <td class="text-end text-nowrap">
            {{ formatAmount(previousBalance.projected_balance - previousBalance.exercised_balance) }}
          </td>
        </tr>
        <tr>
          <th>{{ incomeString }}</th>
          <td class="text-end text-nowrap">{{ formatAmount(totals.income_projected) }}</td>
          <td class="text-end text-nowrap">{{ formatAmount(totals.income_exercised) }}</td>
          <td class="text-end text-nowrap">{{ formatAmount(totals.income_projected - totals.income_exercised) }}
          </td>
        </tr>
        <tr>
          <th>{{ outcomeString }}</th>
          <td class="text-end text-nowrap">{{ formatAmount(totals.outcome_projected) }}</td>
          <td class="text-end text-nowrap">{{ formatAmount(totals.outcome_exercised) }}</td>
          <td class="text-end text-nowrap">{{ formatAmount(totals.outcome_projected - totals.outcome_exercised) }}
          </td>
        </tr>
        <tr>
          <th>Totals</th>
          <td class="text-end text-nowrap">{{ formatAmount(totals.projected) }}</td>
          <td class="text-end text-nowrap">{{ formatAmount(totals.exercised) }}</td>
          <td class="text-end text-nowrap">{{ formatAmount(totals.projected - totals.exercised) }}</td>
        </tr>
      </tbody>
    </table>

    <div class="d-flex justify-content-between align-items-center mb-3">
      <h4>Transactions</h4>
      <div class="d-flex gap-3">
        <div class="form-check form-switch">
          <input class="form-check-input" type="checkbox" id="showExercisedSwitch" v-model="showOnlyExercised">
          <label class="form-check-label" for="showExercisedSwitch">
            Only Exercised
          </label>
        </div>
        <div class="form-check form-switch">
          <input class="form-check-input" type="checkbox" id="invertOrderSwitch" v-model="invertOrder">
          <label class="form-check-label" for="invertOrderSwitch">
            Reverse
          </label>
        </div>
      </div>
    </div>

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
        <tr v-for="transaction in transactionList" :key="transaction.id">
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
              {{ formatAmount(transaction.amount) }}
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
import { useWorkspacesStore } from '../stores/workspaces'
import { formatCurrency } from '../utils/utilities'
import moment from 'moment'

const props = defineProps({
  account: Object,
  startDate: String,
  endDate: String
})

const accountsStore = useAccountsStore()
const workspacesStore = useWorkspacesStore()
const previousBalance = ref({})

// Add computed for previous month's end date
const previousMonthEnd = computed(() => {
  return moment(props.startDate).subtract(1, 'day').format('YYYY-MM-DD')
})

const emit = defineEmits(['edit-transaction'])

const transactionsStore = useTransactionsStore()
const isLoading = ref(false)

const invertOrder = ref(false)
const showOnlyExercised = ref(false)

// Add a computed property to check if we have all required data
const hasRequiredData = computed(() => {
  return !!props.account && !!props.startDate && !!props.endDate;
});

// Separate base transactions from filtered transactions
const rangeTransactions = computed(() => {
  // Return empty array if we don't have the required data
  if (!hasRequiredData.value) return [];

  const rangeTransactions = transactionsStore.transactionsByDate.filter(t => {
    const date = moment(t.date)
    return t.account_id === props.account.id &&
      date.isBetween(props.startDate, props.endDate, 'day', '[]')
  })
  return rangeTransactions;
})

const transactionList = computed(() => {
  const transactions = showOnlyExercised.value ?
    rangeTransactions.value.filter(t => t.exercised) :
    rangeTransactions.value;
  return invertOrder.value ? [...transactions].reverse() : transactions
})

// Use baseTransactions for totals calculations
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

// Update formatAmount to handle missing workspace
function formatAmount(amount) {
  const symbol = workspacesStore.currentWorkspace?.currency_symbol || '$';
  return formatCurrency(amount, symbol);
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
    // Skip if any required data is missing
    if (!accountId || !date) return;

    try {
      isLoading.value = true;
      const balance = await accountsStore.fetchAccountBalance(accountId, date);
      previousBalance.value = balance;
    } catch (error) {
      console.error('Failed to fetch previous balance:', error);
    } finally {
      isLoading.value = false;
    }
  },
  { immediate: true }
)
</script>