<template>
  <WorkspaceLayout>
    <!-- Loading state when workspace is not yet loaded -->
    <div v-if="!isWorkspaceLoaded" class="workspace-loading container text-center p-5">
      <div class="spinner-border text-primary mb-3" role="status">
        <span class="visually-hidden">Loading workspace...</span>
      </div>
      <h4>Loading workspace data...</h4>
    </div>

    <!-- Main content when workspace is loaded -->
    <template v-else>
      <DateAccountSelector ref="dateAccountSelector" v-model:accountId="accountId" v-model:selectedDate="selectedDate"
        v-model:rangeType="rangeType" :workspace-name="workspacesStore.currentWorkspace.name"
        :workspace-id="workspacesStore.currentWorkspace.id" />

      <div class="row w-100 ps-2">
        <div class="col-4 overflow-scroll calendar-sidebar">
          <Totals :account="selectedAccount" :start-date="startDate" :end-date="endDate"
            @edit-transaction="showTransactionModal" />
        </div>
        <div class="col-8 pb-1">
          <Calendar :account="selectedAccount" :selected-date="selectedDate" :range-type="rangeType"
            @show-transaction="showTransactionModal" @update-transaction="updateTransaction"
            @delete-transaction="deleteTransaction" />
        </div>
      </div>

      <TransactionModal v-model="showModal" :transaction="currentTransaction" :is-editing="isEditing"
        :focus-on="modalFocusTarget" @save="saveTransaction" @delete="deleteTransaction"
        @duplicate="duplicateTransaction" />
    </template>
  </WorkspaceLayout>
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
import TransactionModal from '../components/modals/TransactionModal.vue'
import WorkspaceLayout from '../layouts/WorkspaceLayout.vue'

const router = useRouter()
const route = useRoute()

const categoriesStore = useCategoriesStore()
const accountsStore = useAccountsStore()
const transactionsStore = useTransactionsStore()
const workspacesStore = useWorkspacesStore()

// Add a computed property to check if workspace is loaded
const isWorkspaceLoaded = computed(() => !!workspacesStore.currentWorkspace)

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
  if (editing && !workspacesStore.hasWritePermission) {
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

// Simplified validation function that uses the enhanced workspace store
async function validateAndSetWorkspace() {
  // Get workspaceId from query parameter
  const workspaceId = route.query.workspaceId;

  // If workspaceId is missing, redirect to workspace selection
  if (!workspaceId) {
    router.replace({
      name: 'workspaces',
      query: { error: 'missing-workspace' }
    });
    return false;
  }

  // Use the enhanced workspace store to validate and load everything
  const result = await workspacesStore.validateAndLoadWorkspace(workspaceId);

  // Handle validation result
  if (!result.success) {
    router.replace({
      name: 'workspaces',
      query: { error: result.error }
    });
    return false;
  }

  // Load accounts for the workspace
  try {
    await accountsStore.fetchAccounts(workspaceId);
  } catch (error) {
    console.error('Error loading accounts:', error);
  }

  // Success - workspace and all dependent data are loaded
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
  // Validate and set workspace - this now loads all dependent data
  const isWorkspaceValid = await validateAndSetWorkspace();

  // Only set initial account if workspace is valid
  if (isWorkspaceValid && accountsStore.accountsByName.length > 0) {
    accountId.value = accountsStore.accountsByName[0].id;
  }
});
</script>