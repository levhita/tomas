<template>
  <div class="toolbar bg-light border-bottom shadow-sm p-3 mb-3">
    <div class="d-flex justify-content-between align-items-center">
      <select class="form-select w-25" :value="accountId" @change="$emit('update:accountId', $event.target.value)">
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
</template>

<script setup>
import { computed } from 'vue'
import moment from 'moment'
import { useAccountsStore } from '../stores/accounts'

const props = defineProps(['accountId', 'currentDate'])
const emit = defineEmits(['update:accountId', 'update:currentDate'])

const accountsStore = useAccountsStore()
const accountsByName = computed(() => accountsStore.accountsByName)
const currentMonth = computed(() => props.currentDate.format('MMMM YYYY'))

function previousMonth() {
  emit('update:currentDate', moment(props.currentDate).subtract(1, 'month'))
}

function nextMonth() {
  emit('update:currentDate', moment(props.currentDate).add(1, 'month'))
}
</script>