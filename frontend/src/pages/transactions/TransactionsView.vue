<template>
  <BookLayout>
    <div class="container p-3">
      <div v-if="booksStore.loading" class="text-center">
        <div class="spinner-border" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>
      <div v-else-if="booksStore.error" class="alert alert-danger">
        {{ booksStore.error }}
      </div>
      <div v-else-if="booksStore.currentBook">
        <p>Selected book: {{ booksStore.currentBook.name }}</p>
        
        <div class="bg-body-secondary rounded-3 shadow-sm p-3">
          <!-- Header -->
          <div class="d-flex flex-wrap align-items-center justify-content-between mb-3 gap-2">
            <h2 class="mb-0 text-light-emphasis fs-4">Transactions</h2>
            <button class="btn btn-info d-flex align-items-center gap-1" type="button">
              <i class="bi bi-plus-lg"></i>
              <span>Create</span>
            </button>
          </div>
          <!-- Filters -->
          <form class="row g-2 d-flex align-items-center flex-columns p-4 mb-4 bg-light rounded-4 ">
            <div class="col-12 col-md-6 m-0">
              <div class="form-floating">
                <input type="text" class="form-control bg-body-tertiary text-light-emphasis" id="search" placeholder="Search transactions" v-model="searchQuery">
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
                    v-for="account in booksStore.currentBookAccounts"
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
                      <span
                        v-if="element.key !== 'select' && element.key !== 'actions'"
                        class="d-inline-flex align-items-center user-select-none"
                        @click="handleSort(element.key)"
                        style="cursor:pointer;"
                      >
                        {{ element.label }}
                        <i
                          v-if="sortKey === element.key"
                          :class="[
                            'bi',
                            sortDirection === 'asc' ? 'bi-arrow-up' : 'bi-arrow-down',
                            'ms-1',
                            'text-info'
                          ]"
                        ></i>
                        <i
                          v-else
                          class="bi bi-arrow-down-up ms-1 text-info opacity-75"
                        ></i>
                      </span>
                      <span v-else>
                        {{ element.label }}
                      </span>
                    </th>
                  </template>
                </draggable>
              </thead>
              
              <tbody>
                <tr v-for="(transaction, i) in filteredTransactions" :key="i">
                  <td v-for="col in columns" :key="col.key" :class="col.tdClass">
                    <template v-if="col.key === 'select'">
                      <input class="form-check-input" type="checkbox" aria-label="Select row" />
                    </template>
                    <template v-else-if="col.key === 'description'">
                      {{ transaction.description }}
                    </template>
                    <template v-else-if="col.key === 'amount'">
                      <span :class="colorByType(formatTransactionType(transaction), 'text')">
                        {{ formatCurrency(transaction.amount, bookCurrencySymbol) }}
                      </span>
                    </template>
                    <template v-else-if="col.key === 'account_name'">
                      {{ formatAccounts(transaction.account_id) }}
                    </template>
                    <template v-else-if="col.key === 'category_name'">
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
              Showing {{ (page - 1) * limit + 1 }} to {{ Math.min(page * limit, total) }} of {{ total }} results
            </div>
            <div class="d-flex align-items-center gap-2">
              <label for="limitSelect" class="form-label mb-0 me-1 small">Rows per page:</label>
              <select id="limitSelect" class="form-select form-select-sm w-auto" v-model.number="limit" @change="handleLimitChange">
                <option :value="5">5</option>
                <option :value="10">10</option>
                <option :value="20">20</option>
                <option :value="50">50</option>
                <option :value="100">100</option>
              </select>
              <nav>
                <ul class="pagination mb-0 ms-2">
                  <li :class="['page-item', { disabled: page === 1 }]">
                    <button class="page-link bg-body-tertiary text-light-emphasis" @click="handlePageChange(page - 1)">Previous</button>
                  </li>
                  <li v-for="p in Math.ceil(total / limit)" :key="p" :class="['page-item', { active: page === p }]">
                    <button
                      class="page-link"
                      :class="page === p ? 'bg-info text-light-emphasis border-info' : 'bg-body-tertiary text-light-emphasis'"
                      @click="handlePageChange(p)"
                    >
                      {{ p }}
                    </button>
                  </li>
                  <li :class="['page-item', { disabled: page === Math.ceil(total / limit) }]">
                    <button class="page-link bg-body-tertiary text-light-emphasis" @click="handlePageChange(page + 1)">Next</button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  </BookLayout>
</template>

<script setup>
// ----------------- Imports -----------------
import { onMounted, ref, watch, computed } from 'vue';
import draggable from 'vuedraggable';
import { formatCurrency, formatTransactionType, colorByType } from '../../utils/utilities';
import BookLayout from '../../layouts/BookLayout.vue';
import { useRouter, useRoute } from 'vue-router';
import { useBooksStore } from '../../stores/books';
import { useTransactionsStore } from '../../stores/transactions';

// ----------------- use* Instances -----------------
const router = useRouter();
const route = useRoute();
const booksStore = useBooksStore();
const transactionsStore = useTransactionsStore();

// ----------------- State -----------------
const transactions = ref([]);
const total = ref(0);
const page = ref(1);
const limit = ref(10); // Default page size
const sortKey = ref('date');
const sortDirection = ref('desc'); // 'asc' or 'desc'
const bookCurrencySymbol = computed(() => booksStore.currentBook?.currency_symbol || '$');

const searchQuery = ref('');
const selectedAccountId = ref(null);

const defaultColumns = [
  { key: 'select', label: '', thClass: '', tdClass: '' },
  { key: 'description', label: 'Description', thClass: 'text-light-emphasis text-start sortable', tdClass: 'text-light-emphasis text-start' },
  { key: 'amount', label: 'Amount', thClass: 'text-light-emphasis text-end sortable', tdClass: 'text-end fw-semibold' },
  { key: 'account_name', label: 'Account', thClass: 'text-light-emphasis text-center sortable', tdClass: 'text-light-emphasis text-center' },
  { key: 'category_name', label: 'Category', thClass: 'text-light-emphasis text-start sortable', tdClass: 'text-start' },
  { key: 'type', label: 'Type', thClass: 'text-light-emphasis text-start sortable', tdClass: 'text-start' },
  { key: 'date', label: 'Date', thClass: 'text-light-emphasis text-end sortable', tdClass: 'text-light-emphasis text-end' },
  { key: 'note', label: 'Note', thClass: 'text-light-emphasis text-center sortable', tdClass: 'text-light-emphasis text-center' },
  { key: 'actions', label: 'Actions', thClass: 'text-light-emphasis text-end', tdClass: 'text-end' },
];
const columns = ref([]);

const columnsNames = columns.value.map(col => ({
  ...col,
  thClass: col.thClass || 'text-light-emphasis text-nowrap',
  tdClass: col.tdClass || 'text-light-emphasis text-nowrap'
}));
const headers = ref([...columnsNames]);

// Fetch transactions with pagination, sorting, and filtering
async function fetchPaginatedTransactions() {
  const bookId = booksStore.currentBook.id;
  const { transactions: transactionsList, total: totalCount } = await transactionsStore.fetchTransactionsByBook(
    bookId,
    {
      page: page.value,
      limit: limit.value,
      sortKey: sortKey.value,
      sortDirection: sortDirection.value,
      accountId: selectedAccountId.value || undefined,
      search: searchQuery.value || ''
    }
  );
  transactions.value = transactionsList;
  total.value = totalCount || transactionsList.length;
}

// Watchers for filters
watch([selectedAccountId, searchQuery], () => {
  page.value = 1;
  fetchPaginatedTransactions();
});

// Remove local filtering from filteredTransactions
const filteredTransactions = computed(() => transactions.value);

// Reset Filters functionality
function resetFilters() {
  searchQuery.value = '';
  selectedAccountId.value = null;
}


// ----------------- Synchronous Functions -----------------
function getColumnsStorageKey() {
  const bookId = booksStore?.currentBook?.id;
  return bookId ? `transactions_columns_order_${bookId}` : 'transactions_columns_order_default';
}

function getSortStorageKey() {
  const bookId = booksStore?.currentBook?.id;
  return bookId ? `transactions_sort_${bookId}` : 'transactions_sort_default';
}

function initColumns() {
  const saved = localStorage.getItem(getColumnsStorageKey());
  columns.value = saved ? JSON.parse(saved) : [...defaultColumns];
}
initColumns();

// Save column order per workspace
function saveColumnOrder() {
  localStorage.setItem(getColumnsStorageKey(), JSON.stringify(columns.value));
}

function onMove(evt) {
  // Prevent moving the first or last column (select/actions)
  if (
    evt.draggedContext.element.key === 'select' ||
    evt.draggedContext.element.key === 'actions'
  ) {
    return false;
  }
  if (
    evt.relatedContext.element.key === 'select' ||
    evt.relatedContext.element.key === 'actions'
  ) {
    return false;
  }
  return true;
}

function formatAccounts(accountId) {
  const result = booksStore.getAccountById(accountId);
  return result.name || '-';
}

// Sort and pagination handlers
function handleSort(key) {
  if (sortKey.value === key) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortDirection.value = 'asc';
  }
  page.value = 1;
  fetchPaginatedTransactions();
  localStorage.setItem(getSortStorageKey(), JSON.stringify({
    sortKey: sortKey.value,
    sortDirection: sortDirection.value
  }));
}

function handlePageChange(newPage) {
  if (newPage < 1 || newPage > Math.ceil(total.value / limit.value)) return;
  page.value = newPage;
  fetchPaginatedTransactions();
}

function handleLimitChange() {
  page.value = 1;
  fetchPaginatedTransactions();
}

// Column order and sort preferences restoration
function restoreColumnOrder() {
  const saved = localStorage.getItem(getColumnsStorageKey());
  columns.value = saved ? JSON.parse(saved) : [...defaultColumns];
}
function restoreSortPreferences() {
  const saved = localStorage.getItem(getSortStorageKey());
  if (saved) {
    try {
      const { sortKey: savedKey, sortDirection: savedDir } = JSON.parse(saved);
      if (savedKey) sortKey.value = savedKey;
      if (savedDir) sortDirection.value = savedDir;
    } catch {}
  }
}
// ----------------- Asynchronous Functions -----------------

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
  const result = await booksStore.loadBookById(bookId);
  // Handle validation result
  if (!result.success) {
    if (result.error === 'invalid-book') {
      // For invalid books, show a 404 page instead of redirecting to books
      router.replace({ 
        name: 'not-found',
        query: { from: route.path }
      });
    } else {
      // For other errors, redirect to books with error message
      router.replace({
        name: 'books',
        query: { error: result.error }
      });
    }
    return false;
  }
  // Success - book and all dependent data are loaded
  return true;
}
// ----------------- Vue Methods -----------------
onMounted(async () => {
  const isBookValid = await validateAndSetBook();
  if (isBookValid) {
    restoreSortPreferences();
    restoreColumnOrder();
    await fetchPaginatedTransactions();
  }
  booksStore.fetchBookAccounts(); // Fetch accounts for the current book
});
</script>