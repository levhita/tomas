<template>
  <Teleport to="body">
    <div v-if="modelValue" class="custom-dialog-overlay" @click.self="cancel">
      <div class="custom-dialog">
        <div class="custom-dialog-header">
          <h5>{{ title }}</h5>
          <button type="button" class="custom-dialog-close" @click="cancel">&times;</button>
        </div>
        <div class="custom-dialog-body">
          <p v-html="message"></p>
        </div>
        <div class="custom-dialog-footer">
          <button type="button" class="btn btn-secondary" @click="cancel">
            {{ cancelText }}
          </button>
          <button type="button" :class="['btn', `btn-${confirmButtonVariant}`]" @click="confirm">
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
/**
 * ConfirmDialog Component
 * 
 * A lightweight confirmation dialog component that doesn't use Bootstrap modal.
 * Can be safely used inside other modals without causing conflicts.
 * Uses Vue's Teleport feature to render at the body level, outside any existing modals.
 * 
 * Props:
 * @prop {Boolean} modelValue - v-model binding for showing/hiding the dialog
 * @prop {String} title - The title of the dialog
 * @prop {String} message - The message to display (can include HTML)
 * @prop {String} confirmText - Text for the confirm button
 * @prop {String} cancelText - Text for the cancel button
 * @prop {String} confirmButtonVariant - Bootstrap button variant for confirm button
 * 
 * Events:
 * @emits update:modelValue - When dialog visibility changes
 * @emits confirm - When user confirms the action
 * @emits cancel - When user cancels the action
 * 
 * Usage:
 * <ConfirmDialog
 *   v-model="showConfirmDialog"
 *   title="Delete Transaction"
 *   message="Are you sure you want to delete this transaction?"
 *   confirmText="Delete"
 *   cancelText="Cancel"
 *   confirmButtonVariant="danger"
 *   @confirm="handleConfirm"
 *   @cancel="handleCancel"
 * />
 */

import { onMounted, onUnmounted } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: 'Confirm Action'
  },
  message: {
    type: String,
    default: 'Are you sure you want to proceed?'
  },
  confirmText: {
    type: String,
    default: 'Confirm'
  },
  cancelText: {
    type: String,
    default: 'Cancel'
  },
  confirmButtonVariant: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'secondary', 'success', 'danger', 'warning', 'info'].includes(value)
  }
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])

// Handle confirm action
function confirm() {
  emit('confirm')
  close()
}

// Handle cancel action
function cancel() {
  emit('cancel')
  close()
}

// Close the dialog
function close() {
  emit('update:modelValue', false)
}

// Handle escape key press to close the dialog
function handleKeyDown(e) {
  if (e.key === 'Escape' && props.modelValue) {
    cancel()
  }
}

// Setup event listeners
onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})
</script>
