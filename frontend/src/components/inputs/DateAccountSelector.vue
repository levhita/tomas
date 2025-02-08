<template>
  <div class="toolbar bg-light border-bottom shadow-sm p-3 mb-3">
    <div class="d-flex justify-content-between align-items-center">
      <div class="d-flex align-items-center gap-3">
        <AccountSelect :modelValue="accountId" @update:modelValue="$emit('update:accountId', $event)" class="w-25" />

        <div class="btn-group" role="group">
          <input type="radio" class="btn-check" name="range" id="monthly" value="monthly" v-model="rangeType">
          <label class="btn btn-outline-primary" for="monthly">Monthly</label>

          <input type="radio" class="btn-check" name="range" id="weekly" value="weekly" v-model="rangeType">
          <label class="btn btn-outline-primary" for="weekly">Weekly</label>
        </div>
      </div>

      <div class="btn-group">
        <button class="btn btn-outline-primary" @click="previousPeriod">
          <i class="bi bi-chevron-left"></i>
        </button>
        <button class="btn btn-outline-primary" disabled>
          {{ selectedPeriod }}
        </button>
        <button class="btn btn-outline-primary" @click="nextPeriod">
          <i class="bi bi-chevron-right"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import moment from 'moment'
import AccountSelect from './AccountSelect.vue'

const props = defineProps({
  accountId: Number,
  selectedDate: String
})

const emit = defineEmits(['update:accountId', 'update:selectedDate'])
const rangeType = ref('monthly')

const selectedPeriod = computed(() => {
  if (rangeType.value === 'weekly') {
    return `Week of ${moment(props.selectedDate).startOf('week').format('MMM D')}`
  }
  return moment(props.selectedDate).format('MMMM YYYY')
})

const startDate = computed(() => {
  return moment(props.selectedDate)
    .startOf(rangeType.value === 'weekly' ? 'week' : 'month')
    .format('YYYY-MM-DD')
})

const endDate = computed(() => {
  return moment(props.selectedDate)
    .endOf(rangeType.value === 'weekly' ? 'week' : 'month')
    .format('YYYY-MM-DD')
})

function previousPeriod() {
  const newDate = moment(props.selectedDate)
    .subtract(1, rangeType.value === 'weekly' ? 'week' : 'month')
    .format('YYYY-MM-DD')
  emit('update:selectedDate', newDate)
}

function nextPeriod() {
  const newDate = moment(props.selectedDate)
    .add(1, rangeType.value === 'weekly' ? 'week' : 'month')
    .format('YYYY-MM-DD')
  emit('update:selectedDate', newDate)
}

defineExpose({ startDate, endDate })
</script>