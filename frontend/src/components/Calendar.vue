<template>
  <FullCalendar ref="calendarRef" :options="calendarOptions" />
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useTransactionsStore } from '../stores/transactions'
import { useWorkspacesStore } from '../stores/workspaces'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import moment from 'moment'

const props = defineProps({
  account: Object,
  selectedDate: String,
  rangeType: String
})

const emit = defineEmits(['show-transaction', 'update-transaction'])

// Get workspace store to access week_start setting
const workspacesStore = useWorkspacesStore()
const transactionsStore = useTransactionsStore()

const accountId = computed(() => props.account?.id)

const emptyTransaction = {
  //id: null,
  //description: '',
  //amount: null,
  //date: null,
  //category_id: '',
  account_id: accountId,
  isExpense: true,
  exercised: false,
  //note: ''
}
const selectedDate = computed(() => moment().format('YYYY-MM-DD'))

// Helper function to convert week_start setting to day index
const getFirstDayIndex = computed(() => {
  // Default to Monday (1) if no current workspace or setting
  if (!workspacesStore.currentWorkspace) return 1

  // Convert week_start string to numerical index for FullCalendar
  // FullCalendar uses: 0=Sunday, 1=Monday, 2=Tuesday, etc.
  return workspacesStore.currentWorkspace.week_start === 'sunday' ? 0 : 1
})

const calendarOptions = computed(() => {
  const events = transactionsStore.transactions.map(transaction => ({
    id: transaction.id,
    title: `
      <div class="transaction-title">
        <div class="transaction-description">${transaction.description}</div>
        <div class="transaction-amount text-end">${formatAmount(transaction.amount, transaction.isExpense)}</div>
      </div>
    `,
    date: transaction.date,
    html: true
  }))

  return {
    plugins: [dayGridPlugin, interactionPlugin],
    initialView: props.rangeType === 'weekly' ? 'dayGridWeek' : 'dayGridMonth',
    initialDate: props.selectedDate,
    firstDay: getFirstDayIndex.value, // Use workspace setting for first day of week
    dateClick: handleDateClick,
    editable: true, // Enable drag-and-drop
    eventDrop: handleEventDrop, // Add drop handler
    events,
    headerToolbar: {
      left: '',
      center: '',
      right: ''
    },
    height: '100%',
    eventContent: (arg) => {
      return { html: arg.event.title }
    },
    eventClick: handleEventClick
  }
})

const calendarRef = ref(null)

async function updateDate() {
  if (calendarRef.value) {
    const api = calendarRef.value.getApi()
    api.gotoDate(props.selectedDate)
  }
}

async function updateView() {
  if (calendarRef.value) {
    const api = calendarRef.value.getApi()
    api.changeView(props.rangeType === 'weekly' ? 'dayGridWeek' : 'dayGridMonth')
  }
}

// Watch for changes to first day setting from workspace
watch(() => workspacesStore.currentWorkspace?.week_start, () => {
  if (calendarRef.value) {
    const api = calendarRef.value.getApi()
    api.setOption('firstDay', getFirstDayIndex.value)
  }
})

watch(() => props.selectedDate, updateDate)
watch(() => props.rangeType, updateView)

function formatAmount(amount, isExpense) {
  if (isExpense) { amount = -amount }

  // Use the currency symbol from the current workspace if available
  const currencySymbol = workspacesStore.currentWorkspace?.currency_symbol || '€'

  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'EUR', // This is just for formatting, we'll use the symbol from workspace
    currencyDisplay: "narrowSymbol"
  }).format(amount).replace('€', currencySymbol) // Replace the Euro symbol with workspace's symbol
}

function handleDateClick(arg) {
  const transaction = {
    ...emptyTransaction,
    date: arg.dateStr,
    exercised: arg.dateStr <= selectedDate.value
  }
  emit('show-transaction', { transaction, editing: false })
}

async function handleEventClick(info) {
  const transaction = await transactionsStore.fetchTransactionById(parseInt(info.event.id))
  if (transaction) {
    emit('show-transaction', { transaction, editing: true })
  }
}

async function handleEventDrop(info) {
  try {
    const transaction = await transactionsStore.fetchTransactionById(parseInt(info.event.id))
    if (transaction) {
      emit('update-transaction', {
        ...transaction,
        date: info.event.startStr
      })
    }
  } catch (error) {
    console.error('Failed to update transaction date:', error)
    info.revert() // Revert the drag if update fails
  }
}
</script>

<style scoped>
.fc-event {
  cursor: move;
}

.fc-event.fc-event-dragging {
  opacity: 0.7;
}
</style>