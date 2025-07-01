<template>
  <WorkspaceLayout>
    <div class="container p-3">
      <div class="bg-body-secondary rounded-3 shadow-sm p-3">
        <!-- Header -->
        <div class="d-flex flex-wrap align-items-center justify-content-between mb-3 gap-2">
          <h2 class="mb-0 text-light-emphasis fs-4">Transactions</h2>
          <div class="d-flex gap-2">
            <button class="btn btn-outline-info d-flex align-items-center gap-1" type="button">
              <i class="bi bi-funnel"></i>
              <span class="d-none d-md-inline">Filter</span>
            </button>
            <button class="btn btn-outline-info d-flex align-items-center gap-1" type="button">
              <i class="bi bi-layout-three-columns"></i>
              <span class="d-none d-md-inline">Columns</span>
            </button>
            <button class="btn btn-info d-flex align-items-center gap-1" type="button">
              <i class="bi bi-plus-lg"></i>
              <span>Create</span>
            </button>
          </div>
        </div>
        <!-- Filters -->
        <form class="row g-2 d-flex align-items-center flex-columns   w-75 p-4 mb-4 bg-light rounded-4 ">
          <div class="col-12 col-md-6 m-0">
            <div class="form-floating">
              <input type="text" class="form-control bg-body-tertiary text-light-emphasis" id="search" placeholder="Search transactions">
              <label for="search" class="text-light-emphasis">Search</label>
            </div>
          </div>
          <div class="col-8 col-md-4 m-0">
            <div class="form-floating">
              <select class="form-select bg-body-tertiary text-light-emphasis" id="account">
                <option selected>All Accounts</option>
                <option>Debit Card</option>
                <option>Mexico Account</option>
              </select>
              <label for="account" class="text-light-emphasis">Account</label>
            </div>
          </div>
          <div class="col-4 col-md-2 m-0">
            <button class="btn btn-info w-100" type="button">Reset Filters</button>
          </div>
        </form>
        <!-- Sortable Table -->
        <div class="table-responsive">
          <table class="table align-middle mb-0">
            <thead class="bg-info bg-opacity-10">
              <tr>
                <th scope="col">
                  <input class="form-check-input" type="checkbox" aria-label="Select all" />
                </th>
                <th
                  class="text-light-emphasis text-start sortable"
                  role="button"
                  @click="sortBy('description')"
                >
                  Description
                  <i :class="sortIcon('description')" class="ms-1"></i>
                </th>
                <th
                  class="text-light-emphasis text-end sortable"
                  role="button"
                  @click="sortBy('amount')"
                >
                  Amount
                  <i :class="sortIcon('amount')" class="ms-1"></i>
                </th>
                <th
                  class="text-light-emphasis text-start sortable"
                  role="button"
                  @click="sortBy('account')"
                >
                  Account
                  <i :class="sortIcon('account')" class="ms-1"></i>
                </th>
                <th
                  class="text-light-emphasis text-start sortable"
                  role="button"
                  @click="sortBy('category')"
                >
                  Category
                  <i :class="sortIcon('category')" class="ms-1"></i>
                </th>
                <th
                  class="text-light-emphasis text-start sortable"
                  role="button"
                  @click="sortBy('type')"
                >
                  Type
                  <i :class="sortIcon('type')" class="ms-1"></i>
                </th>
                <th
                  class="text-light-emphasis text-end sortable"
                  role="button"
                  @click="sortBy('date')"
                >
                  Date
                  <i :class="sortIcon('date')" class="ms-1"></i>
                </th>
                <th
                  class="text-light-emphasis text-start sortable"
                  role="button"
                  @click="sortBy('note')"
                >
                  Note
                  <i :class="sortIcon('note')" class="ms-1"></i>
                </th>
                <th class="text-light-emphasis text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              
              <tr v-for="(tx, i) in sortedTransactions" :key="i">
                <td>
                  <input class="form-check-input" type="checkbox" aria-label="Select row" />
                </td>
                <td class="text-light-emphasis text-start">{{ tx.description }}</td>
                <td class="text-end text-info fw-semibold">{{ tx.amount }}</td>
                <td class="text-light-emphasis text-start">{{ tx.account_id}}</td>
                <td class="text-start">
                  <span class="badge text-white">{{ tx.category_name}}</span>
                </td>
                <td class="text-start">
                  <span class="badge bg-info  text-white">{{ tx.type }}</span>
                </td>
                <td class="text-light-emphasis text-end">{{ tx.date }}</td>
                <td class="text-light-emphasis text-start">{{ tx.note }}</td>
                <td class="text-end">
                  <button class="btn btn-sm btn-info me-1" aria-label="Edit">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-info" aria-label="More">
                    <i class="bi bi-three-dots-vertical"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- Pagination -->
        <div class="d-flex flex-wrap align-items-center justify-content-between mt-3 gap-2">
          <div class="text-light-emphasis small">
            Showing 1 to 5 of 5 results
          </div>
          <nav>
            <ul class="pagination mb-0">
              <li class="page-item disabled">
                <button class="page-link bg-body-tertiary text-light-emphasis">Previous</button>
              </li>
              <li class="page-item active">
                <button class="page-link bg-info text-light-emphasis border-info">1</button>
              </li>
              <li class="page-item disabled">
                <button class="page-link bg-body-tertiary text-light-emphasis">Next</button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>
  </WorkspaceLayout>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import WorkspaceLayout from '../../layouts/WorkspaceLayout.vue'
import { useTransactionsStore } from '../../stores/transactions'
import { useAccountsStore } from '../../stores/accounts'
import { useCategoriesStore } from '../../stores/categories'
import { useWorkspacesStore } from '../../stores/workspaces'

// Store instances
const router = useRouter()
const route = useRoute()
const transactionsStore = useTransactionsStore()
const accountsStore = useAccountsStore()
const categoriesStore = useCategoriesStore()
const workspacesStore = useWorkspacesStore()

// Workspace context
const isWorkspaceLoaded = computed(() => !!workspacesStore.currentWorkspace)
const accountId = ref(null)
const selectedAccount = computed(() => accountsStore.getAccountById(accountId.value))

// Transactions data (only set after fetch resolves)
const transactions = ref([])
const categories = computed(() => categoriesStore.categories)

// Sorting
const sortKey = ref('date')
const sortAsc = ref(false)

function sortBy(key) {
  if (sortKey.value === key) {
    sortAsc.value = !sortAsc.value
  } else {
    sortKey.value = key
    sortAsc.value = key === 'date' ? false : true
  }
}

function sortIcon(key) {
  if (sortKey.value !== key) return 'bi bi-chevron-expand'
  return sortAsc.value ? 'bi bi-chevron-up' : 'bi bi-chevron-down'
}

const sortedTransactions = computed(() => {
  if (!sortKey.value) return transactions.value
  return [...transactions.value].sort((a, b) => {
    let aVal = a[sortKey.value]
    let bVal = b[sortKey.value]
    if (sortKey.value === 'amount') {
      aVal = parseFloat(aVal.replace(/[^0-9.-]+/g, ''))
      bVal = parseFloat(bVal.replace(/[^0-9.-]+/g, ''))
    }
    if (sortKey.value === 'date') {
      aVal = new Date(aVal)
      bVal = new Date(bVal)
    }
    if (aVal < bVal) return sortAsc.value ? -1 : 1
    if (aVal > bVal) return sortAsc.value ? 1 : -1
    return 0
  })
})



// Workspace loading and data fetching
async function validateAndSetWorkspace() {
  const workspaceId = route.query.workspaceId
  if (!workspaceId) {
    router.replace({ name: 'workspaces', query: { error: 'missing-workspace' } })
    return false
  }
  const result = await workspacesStore.validateAndLoadWorkspace(workspaceId)
  if (!result.success) {
    router.replace({ name: 'workspaces', query: { error: result.error } })
    return false
  }
  try {
    await accountsStore.fetchAccounts(workspaceId)
    await categoriesStore.fetchCategories(workspaceId)
    const txResult = await transactionsStore.fetchTransactionsByWorkspace(workspaceId)
    transactions.value = txResult.transactions || []
    console.log('Transactions:', txResult.transactions)
  } catch (error) {
    console.error('Error loading workspace data:', error)
  }
  return true
}

onMounted(async () => {
  const isWorkspaceValid = await validateAndSetWorkspace()
  if (isWorkspaceValid && accountsStore.accountsByName.length > 0) {
    accountId.value = accountsStore.accountsByName[0].id
  }
})
</script>