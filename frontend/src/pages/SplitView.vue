<template>
  <div class="container-fluid">
    <div class="card mb-3">
      <div class="card-header">
        <div class="d-flex justify-content-between align-items-center">
          <select class="form-select w-25" v-model="selectedAccount">
            <option v-for="account in accountsByName" :key="account.id" :value="account.id">
              {{ account.name }}
            </option>
          </select>

          <div class="btn-group">
            <button class="btn btn-outline-primary" @click="previousMonth">
              <i class="bi bi-chevron-left"></i>
            </button>
            <button class="btn btn-outline-primary" disabled>
              {{ currentMonth }}
            </button>
            <button class="btn btn-outline-primary" @click="nextMonth">
              <i class="bi bi-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
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
import { ref, computed, onMounted } from 'vue'
import moment from 'moment'
import Calendar from '../components/Calendar.vue'
import Monthly from '../components/Monthly.vue'
import { useAccountsStore } from '../stores/accounts'

const accountsStore = useAccountsStore()
const selectedAccount = ref(null)
const currentDate = ref(moment())

const accountsByName = computed(() => accountsStore.accountsByName)
const currentMonth = computed(() => currentDate.value.format('MMMM YYYY'))

function previousMonth() {
  currentDate.value = moment(currentDate.value).subtract(1, 'month')
}

function nextMonth() {
  currentDate.value = moment(currentDate.value).add(1, 'month')
}

onMounted(async () => {
  await accountsStore.fetchAccounts()
  if (accountsByName.value.length > 0) {
    selectedAccount.value = accountsByName.value[0].id
  }
})
</script>