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
                >
                  Description
                  <i  class="ms-1"></i>
                </th>
                <th
                  class="text-light-emphasis text-end sortable"
                  role="button"
                >
                  Amount
                  <i  class="ms-1"></i>
                </th>
                <th
                  class="text-light-emphasis text-start sortable"
                  role="button"
                >
                  Account
                  <i  class="ms-1"></i>
                </th>
                <th
                  class="text-light-emphasis text-start sortable"
                  role="button"
                >
                  Category
                  <i class="ms-1"></i>
                </th>
                <th
                  class="text-light-emphasis text-start sortable"
                  role="button"
                >
                  Type
                  <i  class="ms-1"></i>
                </th>
                <th
                  class="text-light-emphasis text-end sortable"
                  role="button"
                >
                  Date
                  <i  class="ms-1"></i>
                </th>
                <th
                  class="text-light-emphasis text-start sortable"
                  role="button"
                >
                  Note
                  <i  class="ms-1"></i>
                </th>
                <th class="text-light-emphasis text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              
              <tr v-for="(transaction, i) in transactions" :key="i">
                <td>
                  <input class="form-check-input" type="checkbox" aria-label="Select row" />
                </td>
                <td class="text-light-emphasis text-start">{{ transaction.description }}</td>
                <td class="text-end text-info fw-semibold">{{ formatCurrency(transaction.amount, workspaceCurrencySymbol) }}</td>
                <td class="text-light-emphasis text-start">{{ formatAccounts(transaction.account_id)}}</td>
                <td class="text-start">
                  <span class="badge bg-info text-white">{{ transaction.category_name}}</span>
                </td>
                <td class="text-start">
                  <span class="badge  text-light" :class="colorByType(formatTransactionType(transaction))">{{ formatTransactionType(transaction) }}</span>
                </td>
                <td class="text-light-emphasis text-end">{{ transaction.date }}</td>
                <td class="text-light-emphasis text-start">{{ transaction.note }}</td>
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
  import {  onMounted, ref, watch } from 'vue';
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