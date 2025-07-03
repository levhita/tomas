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
              <draggable
                tag="tr"
                :list="columns"
                item-key="key"
                :move="onMove"
                @end="saveColumnOrder"
              >
                <template #item="{ element }">
                  <th
                    :class="element.thClass"
                    scope="col"
                    style="cursor: grab;"
                  >
                    {{ element.label }}
                  </th>
                </template>
              </draggable>
            </thead>
            
            <tbody>
              <tr v-for="(transaction, i) in transactions" :key="i">
                <td v-for="col in columns" :key="col.key" :class="col.tdClass">
                  <template v-if="col.key === 'select'">
                    <input class="form-check-input" type="checkbox" aria-label="Select row" />
                  </template>
                  <template v-else-if="col.key === 'description'">
                    {{ transaction.description }}
                  </template>
                  <template v-else-if="col.key === 'amount'">
                    <span :class="colorByType(formatTransactionType(transaction), 'text')">
                      {{ formatCurrency(transaction.amount, workspaceCurrencySymbol) }}
                    </span>
                  </template>
                  <template v-else-if="col.key === 'account'">
                    {{ formatAccounts(transaction.account_id) }}
                  </template>
                  <template v-else-if="col.key === 'category'">
                    <span class="badge bg-info text-white">{{ transaction.category_name }}</span>
                  </template>
                  <template v-else-if="col.key === 'type'">
                    <span class="badge text-light" :class="colorByType(formatTransactionType(transaction))">
                      {{ formatTransactionType(transaction) }}
                    </span>
                  </template>
                  <template v-else-if="col.key === 'date'">
                    {{ transaction.date }}
                  </template>
                  <template v-else-if="col.key === 'note'">
                    {{ transaction.note }}
                  </template>
                  <template v-else-if="col.key === 'actions'">
                    <button class="btn btn-sm btn-info me-1" aria-label="Edit">
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-info" aria-label="More">
                      <i class="bi bi-three-dots-vertical"></i>
                    </button>
                  </template>
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
  import {  onMounted, ref, watch } from 'vue';
  import draggable from 'vuedraggable';
  import { formatCurrency, formatTransactionType, colorByType } from '../../utils/utilities'

  import WorkspaceLayout from '../../layouts/WorkspaceLayout.vue';
  import { useRouter, useRoute } from 'vue-router'

  import { useWorkspacesStore } from '../../stores/workspaces'
  import { useTransactionsStore } from '../../stores/transactions'
  import { useAccountsStore } from '../../stores/accounts'





  const router = useRouter()
  const route = useRoute()

  // Ref to hold the sorted/displayed transactions
  const transactions = ref([]);
  const workspacesStore = useWorkspacesStore();
  const transactionsStore = useTransactionsStore();
  const accountsStore = useAccountsStore();

const defaultColumns = [
  { key: 'select', label: '', thClass: '', tdClass: '' },
  { key: 'description', label: 'Description', thClass: 'text-light-emphasis text-start sortable', tdClass: 'text-light-emphasis text-start' },
  { key: 'amount', label: 'Amount', thClass: 'text-light-emphasis text-end sortable', tdClass: 'text-end fw-semibold' },
  { key: 'account', label: 'Account', thClass: 'text-light-emphasis text-center sortable', tdClass: 'text-light-emphasis text-center' },
  { key: 'category', label: 'Category', thClass: 'text-light-emphasis text-start sortable', tdClass: 'text-start' },
  { key: 'type', label: 'Type', thClass: 'text-light-emphasis text-start sortable', tdClass: 'text-start' },
  { key: 'date', label: 'Date', thClass: 'text-light-emphasis text-end sortable', tdClass: 'text-light-emphasis text-end' },
  { key: 'note', label: 'Note', thClass: 'text-light-emphasis text-center sortable', tdClass: 'text-light-emphasis text-center' },
  { key: 'actions', label: 'Actions', thClass: 'text-light-emphasis text-end', tdClass: 'text-end' }
]
// Load from localStorage or use default
const columns = ref(
  JSON.parse(localStorage.getItem('transactions_columns_order') || 'null') || defaultColumns
)
const columnsnames = columns.value.map(col => ({
  ...col,
  thClass: col.thClass || 'text-light-emphasis text-nowrap',
  tdClass: col.tdClass || 'text-light-emphasis text-nowrap'
}));
const headers = ref([...columnsnames])
console.log('Headers:', headers.value);
function saveColumnOrder() {
  localStorage.setItem('transactions_columns_order', JSON.stringify(columns.value))
}

// Optionally restrict movement (e.g., keep select/actions fixed)
function onMove(evt) {
  // Prevent moving the first or last column (select/actions)
  if (
    evt.draggedContext.element.key === 'select' ||
    evt.draggedContext.element.key === 'actions'
  ) {
    return false
  }
  if (
    evt.relatedContext.element.key === 'select' ||
    evt.relatedContext.element.key === 'actions'
  ) {
    return false
  }
  return true
}
  const workspaceCurrencySymbol = workspacesStore?.currentWorkspace?.currency_symbol;

  function formatAccounts(accountID) {
    console.log('formatAccounts called with:', accountID);
    const result =  accountsStore.getAccountById(accountID);
    
    return result.name || '-';
  }   

  async function validateAndSetWorkspace() {
    const workspaceId = route.params.workspaceId || route.query.workspaceId;
    if (!workspaceId) {
      console.error('No workspace ID provided in route params or query');
      return;
    }
    const result = await workspacesStore.validateAndLoadWorkspace(workspaceId);
    return result;

  }


  // Watch for changes in the store's transactions and update the local ref
  watch(
    () => transactionsStore.transactions,
    (newTransactions) => {
      transactions.value = newTransactions
    },
    { immediate: true }
  )

  onMounted(async () => {
    const isWorkspaceValid = await validateAndSetWorkspace();
    if(isWorkspaceValid){
      const workspaceID = workspacesStore.currentWorkspace.id;
      // load transactions by workspace ID
      await transactionsStore.fetchTransactionsByWorkspace(workspaceID);

    }
    
    
  });


</script>