<template>
  <WorkspaceLayout>
    <div class="transactions container-fluid">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1>Transactions</h1>
        </div>
      </div>

      <!-- Filters -->
      <form class="row g-2 d-flex align-items-center flex-columns p-4 mb-4 bg-light rounded-4">
        <div class="col-12 col-md-6 m-0">
          <div class="form-floating">
            <input 
              type="text" 
              class="form-control bg-body-tertiary text-light-emphasis" 
              id="search" 
              placeholder="Search transactions" 
              v-model="searchQuery" 
              @keypress.enter.prevent
            >
            <label for="search" class="text-light-emphasis">Search</label>
          </div>
        </div>
        <div class="col-8 col-md-4 m-0">
          <div class="form-floating">
            <select
              class="form-select bg-body-tertiary text-light-emphasis"
              id="account"
              v-model="selectedAccountId"
            >
              <option :value="null">All Accounts</option>
              <option
                v-for="account in accountsStore.accounts"
                :key="account.id"
                :value="account.id"
              >
                {{ account.name }}
              </option>
            </select>
            <label for="account" class="text-light-emphasis">Account</label>
          </div>
        </div>
        <div class="col-4 col-md-2 m-0">
          <button class="btn btn-info w-100" type="button" @click="resetFilters">Reset Filters</button>
        </div>
      </form>
      
      <!-- Transactions Grid -->
      <div v-if="transactions.length === 0" class="text-center my-5">
        <div class="alert alert-info">
          <i class="bi bi-info-circle me-2"></i>
          No transactions found. Try adjusting your filters.
        </div>
      </div>
      
      <div v-else class="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-5 g-3">
        <div v-for="transaction in transactions" :key="transaction.id" class="col">
          <div class="card h-100 shadow-sm">
            <div class="card-body p-3">
              <!-- Amount with color coding -->
              <div class="d-flex justify-content-between align-items-start mb-2">
                <h6 class="card-title mb-0 text-truncate me-2" :title="transaction.description">
                  {{ transaction.description }}
                </h6>
                <span 
                  class="fw-bold fs-6"
                  :class="colorByType(formatTransactionType(transaction), 'text')"
                >
                  {{ formatCurrency(transaction.amount, workspaceCurrencySymbol) }}
                </span>
              </div>
              
              <!-- Category badge -->
              <div class="mb-2" v-if="transaction.category_name">
                <span class="badge bg-secondary small">{{ transaction.category_name }}</span>
              </div>
              
              <!-- Account and date info -->
              <div class="small text-muted">
                <div class="d-flex justify-content-between align-items-center">
                  <span class="text-truncate me-2" v-if="transaction.account_name">
                    <i class="bi bi-wallet2 me-1"></i>{{ transaction.account_name }}
                  </span>
                  <span v-if="transaction.date">
                    {{ formatDate(transaction.date) }}
                  </span>
                </div>
              </div>
              
              <!-- Note if available -->
              <div class="mt-2 small text-muted" v-if="transaction.note">
                <div class="text-truncate" :title="transaction.note">
                  <i class="bi bi-chat-text me-1"></i>{{ transaction.note }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </WorkspaceLayout>
</template>

<script setup>
// ----------------- Imports -----------------
import { onMounted, ref, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import WorkspaceLayout from '../layouts/WorkspaceLayout.vue'
import { useWorkspacesStore } from '../stores/workspaces'
import { useTransactionsStore } from '../stores/transactions'
import { useAccountsStore } from '../stores/accounts'
import { formatCurrency, formatTransactionType, colorByType } from '../utils/utilities'

// ----------------- use* Instances -----------------
const route = useRoute()
const workspacesStore = useWorkspacesStore()
const transactionsStore = useTransactionsStore()
const accountsStore = useAccountsStore()

// ----------------- State -----------------
const transactions = ref([])
const total = ref(0)
const page = ref(1)
const sortKey = ref('date')
const sortDirection = ref('desc')

// Filter state
const searchQuery = ref('')
const selectedAccountId = ref(null)

// ----------------- Computed -----------------
const workspaceCurrencySymbol = computed(() => {
  return workspacesStore?.currentWorkspace?.currency_symbol || '€'
})

// ----------------- Methods -----------------
async function fetchTransactions() {
  const workspaceID = workspacesStore.currentWorkspace?.id
  if (!workspaceID) return
  
  try {
    // Use the all transactions endpoint for the workspace
    const response = await fetch(`/api/transactions/${workspaceID}/all?${new URLSearchParams({
      ...(selectedAccountId.value && { accountId: selectedAccountId.value.toString() }),
      ...(searchQuery.value && { search: searchQuery.value })
    })}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch transactions: ${response.statusText}`)
    }

    const data = await response.json()
    transactions.value = data.transactions || []
    total.value = data.total || 0
  } catch (error) {
    console.error('Error fetching transactions:', error)
    transactions.value = []
    total.value = 0
  }
}


// Reset Filters functionality
function resetFilters() {
  searchQuery.value = ''
  selectedAccountId.value = null
}

function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  })
}

async function validateAndSetWorkspace() {
  const workspaceId = route.params.workspaceId || route.query.workspaceId
  if (!workspaceId) {
    console.error('No workspace ID provided in route params or query')
    return false
  }
  const result = await workspacesStore.validateAndLoadWorkspace(workspaceId)
  return result
}

// ----------------- Watchers -----------------
// Watch for filter changes and refetch transactions
watch([selectedAccountId, searchQuery], () => {
  page.value = 1
  fetchTransactions()
})

// ----------------- Lifecycle -----------------
onMounted(async () => {
  const isWorkspaceValid = await validateAndSetWorkspace()
  if (isWorkspaceValid) {
    // Load transactions using the all transactions endpoint
    await fetchTransactions()
  }
})
</script>
