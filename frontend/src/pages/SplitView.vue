<template>
  <DateAccountSelector ref="dateAccountSelector" v-model:accountId="accountId" v-model:selectedDate="selectedDate"
    v-model:rangeType="rangeType" />
  <div class="row flex-grow-1 w-100">
    <div class="col-4">
      <Totals :account="selectedAccount" :start-date="startDate" :end-date="endDate" />
    </div>
    <div class="col-8 pb-1">
      <Calendar :account="selectedAccount" :selected-date="selectedDate" :range-type="rangeType" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import moment from 'moment'
import Calendar from '../components/Calendar.vue'
import Totals from '../components/Totals.vue'
import DateAccountSelector from '../components/inputs/DateAccountSelector.vue'
import { useTransactionsStore } from '../stores/transactions'
import { useAccountsStore } from '../stores/accounts'

const accountsStore = useAccountsStore()
const transactionsStore = useTransactionsStore()

const selectedDate = ref(moment().format('YYYY-MM-DD'))
const dateAccountSelector = ref(null)
const startDate = computed(() => dateAccountSelector.value?.startDate)
const endDate = computed(() => dateAccountSelector.value?.endDate)

const rangeType = ref('monthly')

const accountId = ref(null)
const selectedAccount = computed(() => accountsStore.getAccountById(accountId.value))


watch(
  [() => accountId.value, startDate, endDate],
  async ([accountId, start, end]) => {
    if (accountId && start && end) {
      await transactionsStore.fetchTransactions(accountId, start, end)
    }
  }
)

// Update onMounted to set full account object
onMounted(async () => {
  await accountsStore.fetchAccounts()
  if (accountsStore.accountsByName.length > 0) {
    accountId.value = accountsStore.accountsByName[0].id
  }
})
</script>