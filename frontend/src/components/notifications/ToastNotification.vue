<template>
  <div class="toast-container position-fixed bottom-0 end-0 p-3">
    <div v-for="(toast, index) in toasts" :key="index" class="toast show"
      :class="toast.variant ? `bg-${toast.variant} text-white` : ''" role="alert" aria-live="assertive"
      aria-atomic="true">
      <div class="toast-header" :class="toast.variant ? `bg-${toast.variant} text-white` : ''">
        <i class="bi me-2" :class="getIconForVariant(toast.variant)"></i>
        <strong class="me-auto">{{ toast.title }}</strong>
        <small>{{ toast.timestamp }}</small>
        <button type="button" class="btn-close" :class="toast.variant ? 'btn-close-white' : ''"
          @click="removeToast(index)" aria-label="Close"></button>
      </div>
      <div class="toast-body" :class="toast.variant ? 'text-white' : ''">
        {{ toast.message }}
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * Toast Component
 * 
 * A Bootstrap-based toast notification system that shows non-intrusive messages
 * in the bottom-right corner of the screen. Supports multiple toasts at once and
 * automatically removes them after a configurable duration.
 * 
 * Features:
 * - Multiple toasts display simultaneously
 * - Auto-dismissal after timeout
 * - Different variants for different message types (success, error, etc.)
 * - Customizable titles and messages
 * - Manual dismiss option
 * 
 * Usage through useToast composable:
 * import { useToast } from '@/composables/useToast'
 * 
 * const { showToast } = useToast()
 * 
 * // Show a success toast
 * showToast({
 *   title: 'Success',
 *   message: 'User created successfully!',
 *   variant: 'success'
 * })
 * 
 * Variants:
 * - primary, secondary, success, danger, warning, info
 * 
 * @component
 */
import { ref, computed } from 'vue'

// Global state for toasts
const toasts = ref([])

// Helper function to get appropriate icon for toast variant
function getIconForVariant(variant) {
  switch (variant) {
    case 'success': return 'bi-check-circle-fill'
    case 'danger': return 'bi-exclamation-triangle-fill'
    case 'warning': return 'bi-exclamation-circle-fill'
    case 'info': return 'bi-info-circle-fill'
    case 'primary': return 'bi-bell-fill'
    default: return 'bi-bell'
  }
}

// Remove a toast by index
function removeToast(index) {
  toasts.value.splice(index, 1)
}

// Add a new toast
function addToast(toast) {
  // Add timestamp
  toast.timestamp = new Date().toLocaleTimeString()

  // Add to toasts array
  toasts.value.push(toast)

  // Auto-remove after timeout
  setTimeout(() => {
    const index = toasts.value.indexOf(toast)
    if (index !== -1) {
      removeToast(index)
    }
  }, toast.duration || 5000)
}

defineExpose({
  addToast,
  removeToast,
  toasts
})
</script>

<style>
.toast-container {
  z-index: 1100;
  max-width: 350px;
}

.toast {
  margin-bottom: 0.5rem;
}

.toast.bg-success .btn-close,
.toast.bg-danger .btn-close,
.toast.bg-warning .btn-close,
.toast.bg-info .btn-close,
.toast.bg-primary .btn-close,
.toast.bg-secondary .btn-close {
  filter: invert(1) grayscale(100%) brightness(200%);
}
</style>
