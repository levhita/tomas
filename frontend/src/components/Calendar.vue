<template>
  <div>
    <FullCalendar ref="calendarRef" :options="calendarOptions" />
    <TransactionDialog v-model="showTransactionDialog" :transaction="currentTransaction" :is-editing="isEditing"
      @save="saveTransaction" @delete="deleteTransaction" />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import TransactionDialog from './inputs/TransactionDialog.vue'
import { useTransactionsStore } from '../stores/transactions'
import { useCategoriesStore } from '../stores/categories'
import { useAccountsStore } from '../stores/accounts'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import moment from 'moment'

const props = defineProps({
  accountId: Number,
  selectedDate: String
})

const emptyTransaction = {
  id: null,
  description: '',
  amount: null,
  date: null,
  category_id: '',
  account_id: '',
  isExpense: true,
  exercised: false,
  note: ''
}
const showTransactionDialog = ref(false)
const currentTransaction = ref({ ...emptyTransaction })
const isEditing = ref(false)
const transactionsStore = useTransactionsStore()
const categoriesStore = useCategoriesStore()
const accountsStore = useAccountsStore()

const currentDate = computed(() => moment().format('YYYY-MM-DD'))

const calendarOptions = computed(() => {
  const events = transactionsStore.transactionsByDate.map(transaction => ({
    id: transaction.id,
    title: `
      <div class="transaction-title">
        <div class="transaction-description">${transaction.description}</div>
        <div class="transaction-amount">${formatAmount(transaction.amount, transaction.isExpense)}</div>
      </div>
    `,
    date: transaction.date,
    html: true
  }))
  return {
    plugins: [dayGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    initialDate: props.selectedDate,
    firstDay: 1, // Start week on Monday
    dateClick: handleDateClick,
    editable: true, // Enable drag-and-drop
    eventDrop: handleEventDrop, // Add drop handler
    events,
    headerToolbar: {
      left: '',
      center: '',
      right: '' // user can switch between the two

      //left: 'prev,next today',
      //center: 'title',
      //right: 'dayGridWeek,dayGridMonth' // user can switch between the two
    },
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

watch(() => props.selectedDate, updateDate)

function formatAmount(amount, isExpense) {
  if (isExpense) { amount = -amount }
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'EUR', //TODO: Change to user's currency
    currencyDisplay: "narrowSymbol"
  }).format(amount)
}

function handleDateClick(arg) {
  isEditing.value = false
  currentTransaction.value = { ...emptyTransaction };
  currentTransaction.value.date = arg.dateStr
  if (currentTransaction.value.date <= currentDate.value) {
    currentTransaction.value.exercised = true
  }
  showTransactionDialog.value = true
}

function handleEventClick(info) {
  const transaction = transactionsStore.getTransactionById(parseInt(info.event.id))

  if (transaction) {
    isEditing.value = true
    currentTransaction.value = { ...transaction }
    showTransactionDialog.value = true
  }
}

async function handleEventDrop(info) {
  try {
    const transaction = transactionsStore.getTransactionById(parseInt(info.event.id))
    if (transaction) {
      await transactionsStore.updateTransaction(transaction.id, {
        ...transaction,
        date: info.event.startStr
      })
    }
  } catch (error) {
    console.error('Failed to update transaction date:', error)
    info.revert() // Revert the drag if update fails
  }
}

async function saveTransaction(transaction) {
  try {
    if (isEditing.value) {
      await transactionsStore.updateTransaction(transaction.id, transaction)
    } else {
      await transactionsStore.addTransaction(transaction)
    }
    showTransactionDialog.value = false
  } catch (error) {
    console.error('Failed to save transaction:', error)
  }
}

async function deleteTransaction(id) {
  try {
    await transactionsStore.deleteTransaction(id)
    showTransactionDialog.value = false
  } catch (error) {
    console.error('Failed to delete transaction:', error)
  }
}


// si no corro los 2 no jala XD hay que entender que pasa aqui
async function onMounted() {
  await Promise.all([
    transactionsStore.fetchTransactions(),
    categoriesStore.fetchCategories(),
    accountsStore.fetchAccounts()
  ])
}
onMounted(async () => {
  await Promise.all([
    transactionsStore.fetchTransactions(),
    categoriesStore.fetchCategories(),
    accountsStore.fetchAccounts()
  ])
})
</script>

<style scoped>
.transaction-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2;
}

.dialog-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  min-width: 600px;
}

.fc-event {
  cursor: move;
}

.fc-event.fc-event-dragging {
  opacity: 0.7;
}
</style>