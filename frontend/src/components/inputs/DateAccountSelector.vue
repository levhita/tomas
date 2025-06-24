<template>
  <div class="toolbar bg-body-tertiary border-bottom shadow-sm p-3 mb-3">
    <div class="d-flex justify-content-between align-items-center">
      <!-- Account Selector Component -->
      <AccountSelect :modelValue="accountId" :workspaceId="workspaceId"
        @update:modelValue="$emit('update:accountId', $event)" />

      <div class="btn-group" role="group">
        <input type="radio" class="btn-check" name="range" id="monthly" value="monthly" v-model="rangeType">
        <label class="btn btn-outline-primary" for="monthly">Monthly</label>

        <input type="radio" class="btn-check" name="range" id="weekly" value="weekly" v-model="rangeType">
        <label class="btn btn-outline-primary" for="weekly">Weekly</label>
      </div>

      <div class="btn-group">
        <button class="btn btn-outline-primary" @click="previousPeriod" aria-label="Previous Period">
          <i class="bi bi-chevron-left"></i>
        </button>
        <button class="btn btn-outline-primary" disabled>
          {{ selectedPeriod }}
        </button>
        <button class="btn btn-outline-primary" @click="nextPeriod" aria-label="Next Period">
          <i class="bi bi-chevron-right"></i>
        </button>
      </div>
    </div>
  </div>

  <!-- No need for AccountModal here as it's included in the AccountSelect component -->
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import moment from 'moment'
import AccountSelect from './AccountSelect.vue'
import { useAccountsStore } from '../../stores/accounts'
import { useWorkspacesStore } from '../../stores/workspaces'

const props = defineProps({
  accountId: Number,
  selectedDate: String,
  workspaceId: Number,
  workspaceName: String,
})

const emit = defineEmits(['update:accountId', 'update:selectedDate', 'update:rangeType'])
const rangeType = ref('monthly')

// Account store reference
const accountsStore = useAccountsStore()
// Workspace store for permissions
const workspacesStore = useWorkspacesStore()

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

watch(rangeType, (newType) => {
  emit('update:rangeType', newType)
})

defineExpose({ startDate, endDate })
</script>
