<template>
  <DateAccountSelector ref="dateAccountSelector" v-model:accountId="accountId" v-model:selectedDate="selectedDate"
    v-model:rangeType="rangeType" />
  <div class="row w-100 ps-2">
    <div class="col-4 overflow-scroll" :style="{ height: 'calc(100vh - 170px) ' }">
      <Totals :account="selectedAccount" :start-date="startDate" :end-date="endDate"
        @edit-transaction="showTransactionDialog" />
    </div>
    <div class="col-8 pb-1">
      <Calendar :account="selectedAccount" :selected-date="selectedDate" :range-type="rangeType"
        @show-transaction="showTransactionDialog" @update-transaction="updateTransaction"
        @delete-transaction="deleteTransaction" />
    </div>
  </div>

  <TransactionDialog v-model="showDialog" :transaction="currentTransaction" :is-editing="isEditing"
    :focus-on="dialogFocusTarget" @save="saveTransaction" @delete="deleteTransaction"
    @duplicate="duplicateTransaction" />
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
import { useWorkspacesStore } from '../stores/workspaces'
import TransactionDialog from '../components/inputs/TransactionDialog.vue'

const router = useRouter()
const route = useRoute()

const categoriesStore = useCategoriesStore()
const accountsStore = useAccountsStore()
const transactionsStore = useTransactionsStore()
const workspacesStore = useWorkspacesStore()

const selectedDate = ref(moment().format('YYYY-MM-DD'))
const dateAccountSelector = ref(null)
const startDate = computed(() => dateAccountSelector.value?.startDate)
const endDate = computed(() => dateAccountSelector.value?.endDate)

const rangeType = ref('monthly')

const accountId = ref(null)
const selectedAccount = computed(() => accountsStore.getAccountById(accountId.value))

const showDialog = ref(false)
const currentTransaction = ref({})
const isEditing = ref(false)
const dialogFocusTarget = ref('description')

function showTransactionDialog({ transaction, editing, focusOn = 'description' }) {
  currentTransaction.value = transaction
  isEditing.value = editing
  dialogFocusTarget.value = focusOn
  showDialog.value = true
}

async function saveTransaction(transaction) {
  try {
    if (isEditing.value) {
      await transactionsStore.updateTransaction(transaction.id, transaction)
    } else {
      await transactionsStore.addTransaction(transaction)
    }
    showDialog.value = false
  } catch (error) {
    console.error('Failed to save transaction:', error)
  }
}

async function deleteTransaction(id) {
  try {
    await transactionsStore.deleteTransaction(id)
    showDialog.value = false
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
    showDialog.value = false
  } catch (error) {
    console.error('Failed to duplicate transaction:', error)
  }
}

async function validateAndSetWorkspace() {
  // Get workspaceId from query parameter
  const workspaceId = route.query.workspaceId

  // If workspaceId is missing, redirect to workspace selection
  if (!workspaceId) {
    router.replace({
      name: 'workspaces',
      query: { error: 'missing-workspace' }
    })
    return false
  }

  try {
    // Try to fetch workspaces if not already loaded
    if (workspacesStore.workspaces.length === 0) {
      await workspacesStore.fetchWorkspaces()
    }

    // Set current workspace
    const workspace = workspacesStore.getWorkspaceById(workspaceId)

    // If workspace doesn't exist, redirect to workspace selection
    if (!workspace) {
      router.replace({
        name: 'workspaces',
        query: { error: 'invalid-workspace' }
      })
      return false
    }

    // Set the workspace as current
    workspacesStore.setCurrentWorkspace(workspace)
    return true

  } catch (error) {
    console.error('Error validating workspace:', error)
    router.replace({
      name: 'workspaces',
      query: { error: 'workspace-error' }
    })
    return false
  }
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

// Update onMounted to validate workspace first
onMounted(async () => {
  // Validate and set workspace first
  const isWorkspaceValid = await validateAndSetWorkspace()

  // Only proceed if workspace is valid
  if (isWorkspaceValid) {
    // Fetch categories and accounts for the current workspace
    await Promise.all([
      categoriesStore.fetchCategories(workspacesStore.currentWorkspace.id),
      accountsStore.fetchAccounts(workspacesStore.currentWorkspace.id)
    ])

    // Set the first account as selected if available
    if (accountsStore.accountsByName.length > 0) {
      accountId.value = accountsStore.accountsByName[0].id
    }
  }
})
</script>