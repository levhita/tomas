<template>
  <div class="container-fluid">
    <DateAccountSelector v-model:accountId="selectedAccount" v-model:currentDate="currentDate" />
    <div class="row">
      <div class="col-4">
        <Monthly :account-id="selectedAccount" :current-date="currentDate" />
      </div>
      <div class="col-8">
        <Calendar :account-id="selectedAccount" :current-date="currentDate" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import moment from 'moment'
import Calendar from '../components/Calendar.vue'
import Monthly from '../components/Monthly.vue'
import DateAccountSelector from '../components/inputs/DateAccountSelector.vue'
import { useAccountsStore } from '../stores/accounts'

const accountsStore = useAccountsStore()
const selectedAccount = ref(null)
const currentDate = ref(moment())

onMounted(async () => {
  await accountsStore.fetchAccounts()
  if (accountsStore.accountsByName.length > 0) {
    selectedAccount.value = accountsStore.accountsByName[0].id
  }
})
</script>