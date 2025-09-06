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
                <div class="mb-3">
                    <p class="text-muted mb-0">{{ booksStore.currentBook.name }}</p>
                </div>

                <!-- Search Form -->
                <SearchForm 
                    v-model="searchQuery"
                    placeholder="Search by description..."
                    search-input-id="searchOverTransactions"
                    @clear-search="handleClearSearch"
                    @clear-all="handleClearAllFilters"
                />



                <!-- Loading state for transactions -->
                <div v-if="loading" class="text-center py-4">
                    <div class="spinner-border" role="status">
                        <span class="visually-hidden">Loading transactions...</span>
                    </div>
                </div>

                <!-- No transactions state -->
                <div v-else-if="!transactions.length" class="text-center py-5">
                    <i class="bi bi-receipt fs-1 text-muted"></i>
                    <h4 class="text-muted mt-2">No transactions found</h4>
                    <p class="text-muted">Try adjusting your search criteria</p>
                </div>

                <!-- Transaction Cards Grid -->
                <div v-else class="row g-3">
                    <div 
                        v-for="transaction in filteredTransactions" 
                        :key="transaction.id"
                        class="col-12 col-sm-6 col-lg-4 col-xl-3"
                    >
                        <div class="card h-100 bg-body-secondary border-0 shadow-sm">
                            <div class="card-body d-flex flex-column">
                                <!-- Transaction Type Badge -->
                                <div class="d-flex justify-content-between align-items-start mb-2">
                                    <span class="badge text-light" :class="colorByType(formatTransactionType(transaction))">
                                        {{ formatTransactionType(transaction) }}
                                    </span>
                                    <small class="text-muted">{{ formatDate(transaction.date) }}</small>
                                </div>

                                <!-- Description -->
                                <h6 class="card-title text-light-emphasis mb-2">
                                    {{ transaction.description }}
                                </h6>

                                <!-- Amount -->
                                <div class="mb-2">
                                    <span 
                                        class="fs-5 fw-bold" 
                                        :class="colorByType(formatTransactionType(transaction), 'text')"
                                    >
                                        {{ formatCurrency(transaction.amount, bookCurrencySymbol) }}
                                    </span>
                                </div>

                                <!-- Account -->
                                <div class="d-flex align-items-center mb-2">
                                    <i class="bi bi-building me-2 text-muted"></i>
                                    <small class="text-light-emphasis">{{ transaction.account_name }}</small>
                                </div>

                                <!-- Category (if exists) -->
                                <div v-if="transaction.category_name" class="mb-2">
                                    <span class="badge bg-info text-white small">
                                        {{ transaction.category_name }}
                                    </span>
                                </div>

                                <!-- Note (if exists) -->
                                <div v-if="transaction.note" class="mb-2">
                                    <small class="text-muted">
                                        <i class="bi bi-sticky me-1"></i>
                                        {{ transaction.note }}
                                    </small>
                                </div>

                                <!-- Exercised Status -->
                                <div class="mt-auto">
                                    <small class="text-muted">
                                        Status: 
                                        <span :class="transaction.exercised ? 'text-success' : 'text-warning'">
                                            {{ transaction.exercised ? 'Exercised' : 'Pending' }}
                                        </span>
                                    </small>
                                </div>

                                <!-- Edit Button -->
                                <div class="mt-2">
                                    <button 
                                        type="button" 
                                        class="btn btn-outline-primary btn-sm w-100"
                                        @click="editTransaction(transaction)"
                                    >
                                        <i class="bi bi-pencil me-1"></i>
                                        Edit Transaction
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Transaction Modal -->
        <TransactionModal 
            v-model="showModal" 
            :transaction="currentTransaction" 
            :is-editing="isEditing"
            :focus-on="modalFocusTarget" 
            @save="saveTransaction" 
            @delete="deleteTransaction"
            @duplicate="duplicateTransaction" 
        />
    </BookLayout>
</template>

<script setup>
import { onMounted, ref, watch, computed, nextTick } from 'vue';
import BookLayout from '../../layouts/BookLayout.vue';
import TransactionModal from '../../components/modals/TransactionModal.vue';
import SearchForm from '../../components/inputs/SearchForm.vue';
import { useRouter, useRoute } from 'vue-router';
import { useBooksStore } from '../../stores/books';
import { useTransactionsStore } from '../../stores/transactions';
import { formatCurrency, formatTransactionType, colorByType } from '../../utils/utilities';

// Router and stores
const router = useRouter();
const route = useRoute();
const booksStore = useBooksStore();
const transactionsStore = useTransactionsStore();

// State
const transactions = ref([]);
const loading = ref(false);
const searchQuery = ref('');
const startDate = ref('');
const endDate = ref('');

// Modal state for transaction editing
const showModal = ref(false);
const currentTransaction = ref({});
const isEditing = ref(false);
const modalFocusTarget = ref('description');

// Computed properties
const bookCurrencySymbol = computed(() => booksStore.currentBook?.currency_symbol || '$');

const filteredTransactions = computed(() => {
    let filtered = transactions.value;
    
    // Filter by description search
    if (searchQuery.value.trim()) {
        const query = searchQuery.value.toLowerCase();
        filtered = filtered.filter(transaction => 
            transaction.description?.toLowerCase().includes(query)
        );
    }
    
    return filtered;
});


// Methods
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toDateString();
}

function clearSearch() {
    searchQuery.value = '';
}

function handleClearSearch() {
    clearSearch();
}


function handleClearAllFilters() {
    clearSearch();
}

function editTransaction(transaction) {
    // Check permissions before allowing edit
    if (!booksStore.hasWritePermission) {
        // Convert to readonly view if no write permission
        showTransactionModal({ transaction, editing: false });
        return;
    }
    
    showTransactionModal({ transaction, editing: true });
}

function showTransactionModal({ transaction, editing, focusOn = 'description' }) {
    // If trying to edit but no permission, either show readonly or prevent
    if (editing && !booksStore.hasWritePermission) {
        // We can either show as readonly or return without showing
        editing = false; // Convert to readonly view
    }

    currentTransaction.value = transaction;
    isEditing.value = editing;
    modalFocusTarget.value = focusOn;
    showModal.value = true;
}

async function saveTransaction(transaction) {
    try {
        if (isEditing.value) {
            await transactionsStore.updateTransaction(transaction.id, transaction);
        } else {
            await transactionsStore.addTransaction(transaction);
        }
        showModal.value = false;
        // Refresh transactions to show updated data
        await fetchTransactions();
    } catch (error) {
        // Error handled silently - transaction save failed
    }
}

async function deleteTransaction(id) {
    try {
        await transactionsStore.deleteTransaction(id);
        showModal.value = false;
        // Refresh transactions to show updated data
        await fetchTransactions();
    } catch (error) {
        // Error handled silently - transaction delete failed
    }
}

async function duplicateTransaction(transaction) {
    try {
        await transactionsStore.addTransaction(transaction);
        showModal.value = false;
        // Refresh transactions to show new duplicate
        await fetchTransactions();
    } catch (error) {
        // Error handled silently - transaction duplicate failed
    }
}

async function fetchTransactions() {
    if (!booksStore.currentBook?.id) return;
    
    loading.value = true;
    try {
        const result = await transactionsStore.fetchTransactionsByBook(
            booksStore.currentBook.id,
            {
                limit: 1000, // Fetch all transactions
                sortKey: 'date',
                sortDirection: 'desc'
            }
        );
        transactions.value = result.transactions || [];
    } catch (error) {
        // Error handled silently - fallback to empty array
        transactions.value = [];
    } finally {
        loading.value = false;
    }
}

async function validateAndSetBook() {
    const bookId = route.query.bookId;
    
    if (!bookId) {
        router.replace({
            name: 'books',
            query: { error: 'missing-book' }
        });
        return false;
    }

    const result = await booksStore.loadBookById(bookId);
    
    if (!result.success) {
        if (result.error === 'invalid-book') {
            router.replace({ 
                name: 'not-found',
                query: { from: route.path }
            });
        } else {
            router.replace({
                name: 'books',
                query: { error: result.error }
            });
        }
        return false;
    }
    
    return true;
}

// Lifecycle
onMounted(async () => {
    const isBookValid = await validateAndSetBook();
    if (isBookValid) {
        await fetchTransactions();
    }
});
</script>