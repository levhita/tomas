<template>
  <div class="container-fluid">
    <DateAccountSelector v-model:accountId="selectedAccount" v-model:selectedDate="selectedDate" />
    <div class="row">
      <div class="col-4">
        <Totals :account-id="selectedAccount" :selected-date="selectedDate" />
      </div>
      <div class="col-8">
        <Calendar :account-id="selectedAccount" :selected-date="selectedDate" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import moment from 'moment'
import Calendar from '../components/Calendar.vue'
import Totals from '../components/Totals.vue'
import DateAccountSelector from '../components/inputs/DateAccountSelector.vue'
import { useAccountsStore } from '../stores/accounts'

const accountsStore = useAccountsStore()
const selectedAccount = ref(null)
const selectedDate = ref(moment().format('YYYY-MM-DD'))

onMounted(async () => {
  await accountsStore.fetchAccounts()
  if (accountsStore.accountsByName.length > 0) {
    selectedAccount.value = accountsStore.accountsByName[0].id
  }
})
</script>