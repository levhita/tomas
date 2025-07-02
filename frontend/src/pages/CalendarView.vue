<template>
  <BookLayout>
    <!-- Loading state when book is not yet loaded -->
    <div v-if="!isBookLoaded" class="book-loading container text-center p-5">
      <div class="spinner-border text-primary mb-3" role="status">
        <span class="visually-hidden">Loading book...</span>
      </div>
      <h4>Loading book data...</h4>
    </div>

    <!-- Main content when book is loaded -->
    <template v-else>
      <DateAccountSelector ref="dateAccountSelector" v-model:accountId="accountId" v-model:selectedDate="selectedDate"
        v-model:rangeType="rangeType" :book-name="booksStore.currentBook.name"
        :book-id="booksStore.currentBook.id" />

      <div class="row w-100 ps-2">
        <div class="col-4 overflow-scroll calendar-sidebar p-2">
          <Totals :account="selectedAccount" :start-date="startDate" :end-date="endDate"
            @edit-transaction="showTransactionModal" />
        </div>
        <div class="col-8 pb-1 p-2">
          <Calendar :account="selectedAccount" :selected-date="selectedDate" :range-type="rangeType"
            @show-transaction="showTransactionModal" @update-transaction="updateTransaction"
            @delete-transaction="deleteTransaction" />
        </div>
      </div>

      <TransactionModal v-model="showModal" :transaction="currentTransaction" :is-editing="isEditing"
        :focus-on="modalFocusTarget" @save="saveTransaction" @delete="deleteTransaction"
        @duplicate="duplicateTransaction" />
    </template>
  </BookLayout>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import moment from 'moment'
import Calendar from '../components/Calendar.vue'
import Totals from '../components/Totals.vue'
import DateAccountSelector from '../components/inputs/DateAccountSelector.vue'
import { useTransactionsStore } from '../stores/transactions'
import { useAccountsStore } from '../stores/accounts'
import { useCategoriesStore } from '../stores/categories'
import { useBooksStore } from '../stores/books'
import TransactionModal from '../components/modals/TransactionModal.vue'
import BookLayout from '../layouts/BookLayout.vue'

const router = useRouter()
const route = useRoute()

const categoriesStore = useCategoriesStore()
const accountsStore = useAccountsStore()
const transactionsStore = useTransactionsStore()
const booksStore = useBooksStore()

// Add a computed property to check if book is loaded
const isBookLoaded = computed(() => !!booksStore.currentBook)

const selectedDate = ref(moment().format('YYYY-MM-DD'))
const dateAccountSelector = ref(null)
const startDate = computed(() => dateAccountSelector.value?.startDate)
const endDate = computed(() => dateAccountSelector.value?.endDate)

const rangeType = ref('monthly')

const accountId = ref(null)
const selectedAccount = computed(() => accountsStore.getAccountById(accountId.value))

const showModal = ref(false)
const currentTransaction = ref({})
const isEditing = ref(false)
const modalFocusTarget = ref('description')

function showTransactionModal({ transaction, editing, focusOn = 'description' }) {
  // If trying to edit but no permission, either show readonly or prevent
  if (editing && !booksStore.hasWritePermission) {
    // We can either show as readonly or return without showing
    editing = false; // Convert to readonly view
  }

  currentTransaction.value = transaction
  isEditing.value = editing
  modalFocusTarget.value = focusOn
  showModal.value = true
}

async function saveTransaction(transaction) {
  try {
    if (isEditing.value) {
      await transactionsStore.updateTransaction(transaction.id, transaction)
    } else {
      await transactionsStore.addTransaction(transaction)
    }
    showModal.value = false
  } catch (error) {
    console.error('Failed to save transaction:', error)
  }
}

async function deleteTransaction(id) {
  try {
    await transactionsStore.deleteTransaction(id)
    showModal.value = false
  } catch (error) {
    console.error('Failed to delete transaction:', error)
  }
}

async function updateTransaction(transaction) {
  await transactionsStore.updateTransaction(transaction.id, transaction)
}

async function duplicateTransaction(transaction) {
  try {
    await transactionsStore.addTransaction(transaction)
    showModal.value = false
  } catch (error) {
    console.error('Failed to duplicate transaction:', error)
  }
}

// Simplified validation function that uses the enhanced book store
async function validateAndSetBook() {
  // Get bookId from query parameter
  const bookId = route.query.bookId;

  // If bookId is missing, redirect to book selection
  if (!bookId) {
    router.replace({
      name: 'books',
      query: { error: 'missing-book' }
    });
    return false;
  }

  // Use the enhanced book store to validate and load everything
  const result = await booksStore.validateAndLoadBook(bookId);

  // Handle validation result
  if (!result.success) {
    router.replace({
      name: 'books',
      query: { error: result.error }
    });
    return false;
  }

  // Load accounts for the book
  try {
    await accountsStore.fetchAccounts(bookId);
  } catch (error) {
    console.error('Error loading accounts:', error);
  }

  // Success - book and all dependent data are loaded
  return true;
}

watch(
  [() => accountId.value, startDate, endDate],
  async ([accountId, start, end]) => {
    if (accountId && start && end) {
      const extendedStart = moment(start).subtract(1, 'week').format('YYYY-MM-DD')
      const extendedEnd = moment(end).add(1, 'week').format('YYYY-MM-DD')
      await transactionsStore.fetchTransactions(accountId, extendedStart, extendedEnd)
    }
  }
)

// Update onMounted to use the simplified approach
onMounted(async () => {
  // Validate and set book - this now loads all dependent data
  const isBookValid = await validateAndSetBook();

  // Only set initial account if book is valid
  if (isBookValid && accountsStore.accountsByName.length > 0) {
    accountId.value = accountsStore.accountsByName[0].id;
  }
});
</script>