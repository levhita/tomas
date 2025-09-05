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
                <div class="mb-4">
                    <div class="form-floating">
                        <input 
                            type="text" 
                            class="form-control bg-body-tertiary text-light-emphasis" 
                            id="searchDescription" 
                            placeholder="Search by description..." 
                            v-model="searchQuery"
                        >
                        <label for="searchDescription" class="text-light-emphasis">
                            <i class="bi bi-search me-1"></i>
                            Search by description...
                        </label>
                    </div>
                </div>

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
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </BookLayout>
</template>

<script setup>
import { onMounted, ref, watch, computed } from 'vue';
import BookLayout from '../../layouts/BookLayout.vue';
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

// Computed properties
const bookCurrencySymbol = computed(() => booksStore.currentBook?.currency_symbol || '$');

const filteredTransactions = computed(() => {
    if (!searchQuery.value.trim()) {
        return transactions.value;
    }
    
    const query = searchQuery.value.toLowerCase();
    return transactions.value.filter(transaction => 
        transaction.description?.toLowerCase().includes(query)
    );
});

// Methods
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString();
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
        console.error('Error fetching transactions:', error);
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