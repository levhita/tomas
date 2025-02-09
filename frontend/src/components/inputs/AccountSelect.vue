<template>
  <select class="form-control" :value="modelValue" @change="$emit('update:modelValue', Number($event.target.value))"
    required>
    <option value="">Select Account</option>
    <option v-for="account in accountsByName" :key="account.id" :value="account.id">
      {{ account.name }}
    </option>
  </select>
</template>

<script setup>
import { computed } from 'vue'
import { useAccountsStore } from '../../stores/accounts'

const props = defineProps(['modelValue'])
const emit = defineEmits(['update:modelValue'])

const accountsStore = useAccountsStore()
const accountsByName = computed(() => accountsStore.accountsByName)
</script>