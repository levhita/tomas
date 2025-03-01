<template>
  <div class="settings container py-4">
    <h1>Settings</h1>

    <div class="card mb-4">
      <div class="card-header">
        <h2 class="h5 mb-0">General Settings</h2>
      </div>
      <div class="card-body">
        <div class="mb-3">
          <label class="form-label">Default Currency</label>
          <select class="form-select" v-model="settings.currency">
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
          </select>
        </div>

        <div class="mb-3">
          <label class="form-label">First Day of Week</label>
          <select class="form-select" v-model="settings.firstDayOfWeek">
            <option value="0">Sunday</option>
            <option value="1">Monday</option>
          </select>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2 class="h5 mb-0">Account Management</h2>
      </div>
      <div class="card-body">
        <!-- Account settings content will go here -->
        <p class="text-muted">Account management features coming soon...</p>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref } from 'vue'

  const settings = ref({
    currency: 'USD',
    firstDayOfWeek: 0
  })
</script>