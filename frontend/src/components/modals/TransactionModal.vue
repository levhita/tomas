<template>
  <!-- Bootstrap Modal Container -->
  <div class="modal fade" :class="{ show: modelValue }" :style="{ display: modelValue ? 'block' : 'none' }"
    tabindex="-1" ref="modalElement">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <!-- Modal Header -->
        <div class="modal-header">
          <h3 class="modal-title">
            {{ !hasWritePermission ? 'View' : (isEditing ? 'Edit' : 'Create New') }} Transaction
          </h3>
          <button type="button" class="btn-close" aria-label="Close" @click="close"></button>
        </div>

        <!-- Modal Body -->
        <div class="modal-body">
          <form @submit.prevent="save">
            <div class="form-floating mb-3">
              <input id="transactionInput" ref="descriptionInput" v-model="transaction.description" class="form-control"
                placeholder="Groceries, Rent, etc." required @keyup.esc="close" :disabled="!hasWritePermission" />
              <label for="transactionInput">Description</label>
            </div>

            <div class="row mb-3">
              <div class="col-7">
                <div class="form-floating">
                  <CurrencyInput id="amountInput" ref="amountInput" v-model="amount" required @keyup.esc="close"
                    :disabled="!hasWritePermission" />
                  <label for="amountInput">Amount</label>
                </div>
              </div>
              <div class="col-5">
                <div class="form-floating">
                  <input id="dateInput" type="date" class="form-control" v-model="transaction.date" required
                    :disabled="!hasWritePermission" />
                  <label for="dateInput" class="form-label">Date</label>
                </div>
              </div>
            </div>

            <div class="btn-group w-100 h-100 mb-3" role="group">
              <input type="radio" class="btn-check" name="type" id="expense" value="expense" v-model="transactionType"
                :disabled="!hasWritePermission">
              <label class="btn btn-outline-primary" for="expense">
                {{ isDebitAccount ? 'Expense' : 'Payment' }}
              </label>

              <input type="radio" class="btn-check" name="type" id="income" value="income" v-model="transactionType"
                :disabled="!hasWritePermission">
              <label class="btn btn-outline-primary" for="income">
                {{ isDebitAccount ? 'Income' : 'Charge' }}
              </label>
            </div>

            <div class="form-check mb-3">
              <input type="checkbox" class="form-check-input" v-model="transaction.exercised"
                :disabled="!hasWritePermission" />
              <label class="form-check-label">Already exercised</label>
            </div>

            <div class="row mb-3">
              <div class="col-6">
                <div class="form-floating">
                  <AccountSelect v-model="transaction.account_id" :showEdit="hasWritePermission" />
                  <label>Account</label>
                </div>
              </div>
              <div class="col-6">
                <div class="form-floating">
                  <CategorySelect v-model="transaction.category_id" :type="categoryType" />
                  <label>Category</label>
                </div>
              </div>
            </div>

            <div class="form-floating mb-3">
              <textarea id="noteTextarea" class="form-control" v-model="transaction.note"
                placeholder="Additional details..." :disabled="!hasWritePermission"></textarea>
              <label for="noteTextarea">Note</label>
            </div>
          </form>
        </div>

        <!-- Modal Footer -->
        <div class="modal-footer d-flex justify-content-between">
          <div>
            <button v-if="isEditing && hasWritePermission" type="button" class="btn btn-danger me-2"
              @click="confirmDelete">
              Delete
            </button>
            <div v-if="isEditing && hasWritePermission" class="btn-group">
              <button type="button" class="btn btn-secondary" @click="duplicate">
                <i class="bi bi-files"></i> Duplicate
              </button>
              <button type="button" class="btn btn-secondary" @click="duplicateNextMonth">
                <i class="bi bi-calendar-plus"></i> Next Month
              </button>
            </div>
          </div>
          <div class="d-flex gap-2">
            <button type="button" class="btn btn-secondary" @click="close">Close</button>
            <button v-if="hasWritePermission" type="submit" class="btn btn-primary" @click="save">Save</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Bootstrap Modal Backdrop -->
  <div v-if="modelValue" class="modal-backdrop fade show"></div>
</template>

<script setup>
/**
 * TransactionModal Component
 * 
 * A comprehensive modal component for creating and editing financial transactions.
 * Built using Bootstrap modal structure with full form validation and transaction
 * management capabilities.
 * 
 * Features:
 * - Create new transactions
 * - Edit existing transactions
 * - Duplicate transactions (same month or next month)
 * - Delete transactions with confirmation
 * - Dynamic account type support (debit/credit)
 * - Form validation and keyboard shortcuts
 * - Focus management for better UX
 * - Bootstrap modal integration
 * 
 * Props:
 * @prop {boolean} modelValue - Controls modal visibility
 * @prop {Object} transaction - Transaction object to edit/create
 * @prop {boolean} isEditing - Whether this is an edit or create operation
 * @prop {string} focusOn - Which field to focus on when modal opens ('description' or 'amount')
 * 
 * Events:
 * @event update:modelValue - Emitted when modal visibility should change
 * @event save - Emitted when transaction should be saved (payload: transaction object)
 * @event delete - Emitted when transaction should be deleted (payload: transaction id)
 * @event duplicate - Emitted when transaction should be duplicated (payload: transaction object)
 * 
 * @component
 */

import { ref, watch, nextTick, computed } from 'vue'
import AccountSelect from '../inputs/AccountSelect.vue'
import CategorySelect from '../inputs/CategorySelect.vue'
import CurrencyInput from '../inputs/CurrencyInput.vue'
import { useAccountsStore } from '../../stores/accounts'
import { useConfirm } from '../../composables/useConfirm'
import { useWorkspacesStore } from '../../stores/workspaces'
import moment from 'moment'

const { confirm } = useConfirm()

const props = defineProps({
  modelValue: Boolean,
  transaction: Object,
  isEditing: Boolean,
  focusOn: {
    type: String,
    default: 'description'
  }
})

const emit = defineEmits(['update:modelValue', 'save', 'delete', 'duplicate'])
const transaction = ref({ ...props.transaction })
const descriptionInput = ref(null)
const amountInput = ref(null)
const amount = ref(0)
const transactionType = ref('expense')
const modalElement = ref(null)

const accountsStore = useAccountsStore()
const workspacesStore = useWorkspacesStore()

// Permission check
const hasWritePermission = computed(() => workspacesStore.hasWritePermission)

const isDebitAccount = computed(() => {
  const account = accountsStore.getAccountById(transaction.value.account_id)
  return account?.type === 'debit'
})

// Compute the correct category type based on account type and transaction type
const categoryType = computed(() => {
  if (isDebitAccount.value) {
    // For debit accounts, use the transaction type directly
    // Expense = expense categories, Income = income categories
    return transactionType.value
  } else {
    // For credit accounts, reverse the logic because:
    // - Charges (expenses) increase debt → show income categories
    // - Payments (income) reduce debt → show expense categories
    return transactionType.value === 'expense' ? 'income' : 'expense'
  }
})

// Watch for account changes to update labels
watch(() => transaction.value.account_id, () => {
  // No need to do anything here, computed property will update automatically
})

watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    // Add modal-open class to body when modal shows
    document.body.classList.add('modal-open')
    nextTick(() => {
      if (props.focusOn === 'amount') {
        amountInput.value?.selectAll()
      } else {
        descriptionInput.value?.focus()
        descriptionInput.value?.select()
      }
    })
  } else {
    // Remove modal-open class from body when modal hides
    document.body.classList.remove('modal-open')
  }
})

watch(() => props.transaction, (newVal) => {
  transaction.value = { ...newVal }
  // Only update transactionType if we have an amount
  if (newVal?.amount !== undefined) {
    amount.value = Math.abs(newVal.amount || 0)
    // For both debit and credit accounts, the transaction type is determined by amount sign
    // Positive = income/payment, Negative = expense/charge
    transactionType.value = newVal.amount >= 0 ? 'income' : 'expense'
  } else {
    // Default to expense for new transactions
    transactionType.value = 'expense'
    amount.value = 0
  }
})

function save() {
  if (!hasWritePermission.value) return;

  // Convert the transaction type to signed amount
  // For both debit and credit accounts: expense = negative, income = positive
  const signedAmount = transactionType.value === 'expense' ? -Math.abs(amount.value) : Math.abs(amount.value)
  emit('save', {
    ...transaction.value,
    amount: signedAmount
  })
  close()
}

function confirmDelete() {
  if (!hasWritePermission.value) return;

  confirm({
    title: 'Delete Transaction',
    message: 'Are you sure you want to delete this transaction? This action cannot be undone.',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    confirmButtonVariant: 'danger'
  })
    .then(() => {
      emit('delete', props.transaction.id)
      close()
    })
    .catch(() => {
      // User canceled, do nothing
    });
}

function duplicate() {
  if (!hasWritePermission.value) return;

  emit('duplicate', {
    ...transaction.value,
    id: undefined
  })
  close()
}

function duplicateNextMonth() {
  if (!hasWritePermission.value) return;

  const nextMonth = moment(transaction.value.date).add(1, 'month').format('YYYY-MM-DD')
  emit('duplicate', {
    ...transaction.value,
    id: undefined,
    date: nextMonth
  })
  close()
}

function close() {
  emit('update:modelValue', false)
}
</script>