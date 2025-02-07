<template>
  <div class="toolbar bg-light border-bottom shadow-sm p-3 mb-3">
    <div class="d-flex justify-content-between align-items-center">
      <AccountSelect :modelValue="accountId" @update:modelValue="$emit('update:accountId', $event)" class="w-25" />

      <div class="btn-group">
        <button class="btn btn-outline-primary" @click="previousMonth">
          <i class="bi bi-chevron-left"></i>
        </button>
        <button class="btn btn-outline-primary" disabled>
          {{ selectedMonth }}
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
import AccountSelect from './AccountSelect.vue'

const props = defineProps({
  accountId: Number,
  selectedDate: String
})

const emit = defineEmits(['update:accountId', 'update:selectedDate'])

const selectedMonth = computed(() => moment(props.selectedDate).format('MMMM YYYY'))

function previousMonth() {
  const newDate = moment(props.selectedDate).subtract(1, 'month').format('YYYY-MM-DD')
  emit('update:selectedDate', newDate)
}

function nextMonth() {
  const newDate = moment(props.selectedDate).add(1, 'month').format('YYYY-MM-DD')
  emit('update:selectedDate', newDate)
}
</script>