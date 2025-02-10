<template>
  <div v-if="modelValue" class="transaction-dialog">
    <div class="dialog-content">
      <div class="row">
        <div class="col-10">
          <h3>{{ isEditing ? 'Edit' : 'Create New' }} Transaction</h3>
        </div>
        <div class="col-2 text-end">
          <button type="button" class="btn-close" aria-label="Close" @click="close"></button>
        </div>
      </div>
      <form @submit.prevent="save">
        <div class="form-floating mb-3">
          <input id="transactionInput" ref="descriptionInput" v-model="transaction.description" class="form-control"
            placeholder="Groceries, Rent, etc." required />
          <label for="transactionInput">Description</label>
        </div>

        <div class="row mb-3">
          <div class="col-7">
            <div class="form-floating">
              <input id="amountInput" ref="amountInput" type="number" class="form-control" v-model.number="amount"
                placeholder="0.00" step="0.01" required />
              <label for="amountInput">Amount</label>
            </div>
          </div>
          <div class="col-5">
            <div class="form-floating">
              <input id="dateInput" type="date" class="form-control" v-model="transaction.date" required />
              <label for="dateInput" class="form-label">Date</label>
            </div>
          </div>
        </div>

        <div class="btn-group w-100 h-100 mb-3" role="group">
          <input type="radio" class="btn-check" name="type" id="expense" value="expense" v-model="transactionType">
          <label class="btn btn-outline-primary" for="expense">
            {{ isDebitAccount ? 'Expense' : 'Payment' }}
          </label>

          <input type="radio" class="btn-check" name="type" id="income" value="income" v-model="transactionType">
          <label class="btn btn-outline-primary" for="income">
            {{ isDebitAccount ? 'Income' : 'Charge' }}
          </label>
        </div>

        <div class="form-check mb-3">
          <input type="checkbox" class="form-check-input" v-model="transaction.exercised" />
          <label class="form-check-label">Already exercised</label>
        </div>

        <div class="row mb-3">
          <div class="col-6">
            <div class="form-floating">
              <AccountSelect v-model="transaction.account_id" />
              <label>Account</label>
            </div>
          </div>
          <div class="col-6">
            <div class="form-floating">
              <CategorySelect v-model="transaction.category_id" />
              <label>Category</label>
            </div>
          </div>
        </div>

        <div class="form-floating mb-3">
          <textarea id="noteTextarea" class="form-control" v-model="transaction.note"
            placeholder="Additional details..." :style="{ 'min-height': '6rem' }"></textarea>
          <label for="noteTextarea">Note</label>
        </div>

        <div class="d-flex justify-content-between align-items-center">
          <button v-if="isEditing" type="button" class="btn btn-danger" @click="confirmDelete">
            Delete
          </button>
          <div class="d-flex gap-2 ms-auto">
            <button type="button" class="btn btn-secondary" @click="close">Cancel</button>
            <button type="submit" class="btn btn-primary">Save</button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, computed } from 'vue'
import AccountSelect from './AccountSelect.vue'
import CategorySelect from './CategorySelect.vue'
import { useAccountsStore } from '../../stores/accounts'

const props = defineProps({
  modelValue: Boolean,
  transaction: Object,
  isEditing: Boolean,
  focusOn: {
    type: String,
    default: 'description'
  }
})

const emit = defineEmits(['update:modelValue', 'save', 'delete'])
const transaction = ref({ ...props.transaction })
const descriptionInput = ref(null)
const amountInput = ref(null)
const amount = ref(0)
const transactionType = ref('expense')

const accountsStore = useAccountsStore()
const isDebitAccount = computed(() => {
  const account = accountsStore.getAccountById(transaction.value.account_id)
  return account?.type === 'debit'
})

// Watch for account changes to update labels
watch(() => transaction.value.account_id, () => {
  // No need to do anything here, computed property will update automatically
})

watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    nextTick(() => {
      if (props.focusOn === 'amount') {
        amountInput.value?.focus()
      } else {
        descriptionInput.value?.focus()
      }
    })
  }
})

watch(() => props.transaction, (newVal) => {
  transaction.value = { ...newVal }
  amount.value = Math.abs(newVal.amount || 0)
  transactionType.value = newVal.amount >= 0 ? 'income' : 'expense'
})

function save() {
  const signedAmount = transactionType.value === 'expense' ? -Math.abs(amount.value) : Math.abs(amount.value)
  emit('save', {
    ...transaction.value,
    amount: signedAmount
  })
  close()
}

function confirmDelete() {
  if (confirm('Are you sure you want to delete this transaction?')) {
    emit('delete', props.transaction.id)
    close()
  }
}

function close() {
  emit('update:modelValue', false)
}
</script>

<style scoped>
.transaction-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-content {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  width: 100%;
  max-width: 700px;
  max-height: 90vh;
  overflow-y: auto;
}
</style>