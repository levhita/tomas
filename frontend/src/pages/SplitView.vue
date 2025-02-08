<template>
  <div class="container-fluid">
    <DateAccountSelector ref="dateSelector" v-model:accountId="selectedAccount" v-model:selectedDate="selectedDate" />
    <div class="row">
      <div class="col-4">
        <Totals :account-id="selectedAccount" :start-date="startDate" :end-date="endDate" />
      </div>
      <div class="col-8">
        <Calendar :account-id="selectedAccount" :selected-date="selectedDate" />
      </div>
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
const selectedAccount = ref(null)
const selectedDate = ref(moment().format('YYYY-MM-DD'))
const dateSelector = ref(null)
const startDate = computed(() => dateSelector.value?.startDate)
const endDate = computed(() => dateSelector.value?.endDate)

watch(
  [() => selectedAccount.value, startDate, endDate],
  async ([newAccount, start, end]) => {
    if (newAccount && start && end) {
      await transactionsStore.fetchTransactions(newAccount, start, end)
    }
  }
)

onMounted(async () => {
  await accountsStore.fetchAccounts()
  if (accountsStore.accountsByName.length > 0) {
    selectedAccount.value = accountsStore.accountsByName[0].id
  }
})
</script>