<template>
  <div class="toolbar bg-body-tertiary border-bottom shadow-sm p-3 mb-3">
    <div class="d-flex justify-content-between align-items-center">
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
                <button class="btn btn-sm btn-link text-primary" @click.stop="openEditAccountModal(account)"
                  aria-label="Edit account">
                  <i class="bi bi-pencil-square"></i>
                </button>
              </button>
            </li>
            <li v-if="!accountsStore.accounts.length" class="dropdown-item text-muted">
              No accounts found
            </li>
            <li>
              <hr class="dropdown-divider">
            </li>
            <li>
              <button class="dropdown-item text-primary" @click="openNewAccountModal">
                <i class="bi bi-plus-circle me-1"></i> Create New Account
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div class="btn-group" role="group">
        <input type="radio" class="btn-check" name="range" id="monthly" value="monthly" v-model="rangeType">
        <label class="btn btn-outline-primary" for="monthly">Monthly</label>

        <input type="radio" class="btn-check" name="range" id="weekly" value="weekly" v-model="rangeType">
        <label class="btn btn-outline-primary" for="weekly">Weekly</label>
      </div>

      <div class="btn-group">
        <button class="btn btn-outline-primary" @click="previousPeriod" aria-label="Previous Period">
          <i class="bi bi-chevron-left"></i>
        </button>
        <button class="btn btn-outline-primary" disabled>
          {{ selectedPeriod }}
        </button>
        <button class="btn btn-outline-primary" @click="nextPeriod" aria-label="Next Period">
          <i class="bi bi-chevron-right"></i>
        </button>
      </div>
    </div>
  </div>

  <!-- Account management modal -->
  <AccountModal v-model="showAccountModal" :account="accountToEdit" :workspaceId="workspaceId"
    :isLoading="accountsStore.isLoading" @save="handleSaveAccount" />
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import moment from 'moment'
import AccountModal from '../modals/AccountModal.vue'
import { useAccountsStore } from '../../stores/accounts'

const props = defineProps({
  accountId: Number,
  selectedDate: String,
  workspaceId: Number,
  workspaceName: String,
})

const emit = defineEmits(['update:accountId', 'update:selectedDate', 'update:rangeType'])
const rangeType = ref('monthly')

// Account store and account management state
const accountsStore = useAccountsStore()
const showAccountModal = ref(false)
const accountToEdit = ref(null)

// Computed property to get the current account name
const currentAccount = computed(() => {
  if (!props.accountId) return null;
  return accountsStore.accounts.find(account => account.id === props.accountId);
})

const selectedPeriod = computed(() => {
  if (rangeType.value === 'weekly') {
    return `Week of ${moment(props.selectedDate).startOf('week').format('MMM D')}`
  }
  return moment(props.selectedDate).format('MMMM YYYY')
})

const startDate = computed(() => {
  return moment(props.selectedDate)
    .startOf(rangeType.value === 'weekly' ? 'week' : 'month')
    .format('YYYY-MM-DD')
})

const endDate = computed(() => {
  return moment(props.selectedDate)
    .endOf(rangeType.value === 'weekly' ? 'week' : 'month')
    .format('YYYY-MM-DD')
})

function previousPeriod() {
  const newDate = moment(props.selectedDate)
    .subtract(1, rangeType.value === 'weekly' ? 'week' : 'month')
    .format('YYYY-MM-DD')
  emit('update:selectedDate', newDate)
}

function nextPeriod() {
  const newDate = moment(props.selectedDate)
    .add(1, rangeType.value === 'weekly' ? 'week' : 'month')
    .format('YYYY-MM-DD')
  emit('update:selectedDate', newDate)
}

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
  emit('update:accountId', account.id)
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
        emit('update:accountId', newAccount.id)
      }
    }
  } catch (error) {
    console.error('Error saving account:', error)
    alert('Error saving account: ' + error.message)
  }
}

watch(rangeType, (newType) => {
  emit('update:rangeType', newType)
})

defineExpose({ startDate, endDate })
</script>
