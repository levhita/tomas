<template>
  <div class="dropdown account-selector">
    <div class="input-group">
      <button class="form-control text-start d-flex align-items-center" type="button" data-bs-toggle="dropdown"
        aria-expanded="false">
        <span v-if="currentAccount" class="text-truncate">{{ currentAccount.name }}</span>
        <span v-else class="text-muted">Select Account</span>
        <i class="bi bi-caret-down-fill ms-auto"></i>
      </button>
      <ul class="dropdown-menu dropdown-menu-end">
        <li v-for="account in accountsStore.accountsByName" :key="account.id">
          <button class="dropdown-item d-flex justify-content-between align-items-center"
            @click="selectAccount(account)">
            {{ account.name }}
            <button v-if="canManageAccounts" class="btn btn-sm btn-link text-primary"
              @click.stop="openEditAccountModal(account)" aria-label="Edit account">
              <i class="bi bi-pencil-square"></i>
            </button>
          </button>
        </li>
        <li v-if="!accountsStore.accounts.length" class="dropdown-item text-muted">
          No accounts found
        </li>
        <li v-if="canManageAccounts">
          <hr class="dropdown-divider">
        </li>
        <li v-if="canManageAccounts">
          <button class="dropdown-item text-primary" @click="openNewAccountModal">
            <i class="bi bi-plus-circle me-1"></i> Create New Account
          </button>
        </li>
      </ul>
    </div>
  </div>

  <!-- Account management modal -->
  <AccountModal v-if="canManageAccounts" v-model="showAccountModal" :account="accountToEdit" :bookId="bookId"
    :isLoading="accountsStore.isLoading" @save="handleSaveAccount" />
</template>

<script setup>
import { ref, computed } from 'vue'
import AccountModal from '../modals/AccountModal.vue'
import { useAccountsStore } from '../../stores/accounts'
import { useBooksStore } from '../../stores/books'
import { useToast } from '../../composables/useToast'

const props = defineProps({
  /**
   * The ID of the currently selected account
   */
  modelValue: Number,

  /**
   * The ID of the book the accounts belong to
   */
  bookId: Number,

  /**
   * Whether to show account editing controls (edit buttons and create account option)
   * This controls all write permissions for accounts
   */
  showEdit: {
    type: Boolean,
    default: true
  },
})

const emit = defineEmits(['update:modelValue'])

// Account store and account management state
const accountsStore = useAccountsStore()
const booksStore = useBooksStore()
const { showToast } = useToast()
const showAccountModal = ref(false)
const accountToEdit = ref(null)

// Check if user has permission to manage accounts directly from the store
const canManageAccounts = computed(() => booksStore.hasAdminPermission)

// Computed property to get the current account
const currentAccount = computed(() => {
  if (!props.modelValue) return null;
  return accountsStore.accounts.find(account => account.id === props.modelValue);
})

/**
 * Opens the account modal for creating a new account
 */
function openNewAccountModal() {
  accountToEdit.value = null
  showAccountModal.value = true
}

/**
 * Opens the account modal for editing an existing account
 * @param {Object} account - The account to edit
 */
function openEditAccountModal(account) {
  accountToEdit.value = account
  showAccountModal.value = true
}

/**
 * Handles account selection
 * @param {Object} account - The selected account
 */
function selectAccount(account) {
  emit('update:modelValue', account.id)
}

/**
 * Handles saving an account (create or update)
 * @param {Object} accountData - The account data to save
 */
async function handleSaveAccount(accountData) {
  try {
    if (accountData.id) {
      // Update existing account
      await accountsStore.updateAccount(accountData.id, accountData)
    } else {
      // Create new account
      await accountsStore.addAccount(accountData)
    }

    showAccountModal.value = false

    // If we just created a new account, select it
    if (!accountData.id && accountsStore.accounts.length > 0) {
      // Find the newly created account (should be the last one added)
      const newAccount = accountsStore.accounts.find(a => a.name === accountData.name)
      if (newAccount) {
        emit('update:modelValue', newAccount.id)
      }
    }
  } catch (error) {
    console.error('Error saving account:', error)
    showToast({
      title: 'Error',
      message: `Error saving account: ${error.message}`,
      variant: 'danger'
    })
  }
}
</script>