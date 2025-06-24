/**
 * useConfirm Composable
 * 
 * A Vue composable for showing confirmation dialogs.
 * Provides a simple API for showing confirmation dialogs and handling user responses.
 * 
 * Usage:
 * ```
 * import { useConfirm } from '@/composables/useConfirm'
 * 
 * // In your component setup
 * const { confirm } = useConfirm()
 * 
 * // Use it like this
 * const handleDelete = async () => {
 *   try {
 *     await confirm({
 *       title: 'Delete Item',
 *       message: 'Are you sure you want to delete this item?',
 *       confirmText: 'Delete',
 *       confirmButtonVariant: 'danger'
 *     })
 *     
 *     // User confirmed, proceed with deletion
 *     deleteItem()
 *   } catch {
 *     // User canceled, do nothing
 *   }
 * }
 * ```
 */

import { ref } from 'vue'

// Singleton state shared across all component instances
const state = {
  isVisible: ref(false),
  title: ref('Confirm Action'),
  message: ref('Are you sure you want to proceed?'),
  confirmText: ref('Confirm'),
  cancelText: ref('Cancel'),
  confirmButtonVariant: ref('primary'),
  resolvePromise: null,
  rejectPromise: null
}

export function useConfirm() {
  /**
   * Show a confirmation dialog
   * 
   * @param {Object} options - Configuration options
   * @param {string} options.title - Dialog title
   * @param {string} options.message - Dialog message (can include HTML)
   * @param {string} options.confirmText - Text for confirm button
   * @param {string} options.cancelText - Text for cancel button
   * @param {string} options.confirmButtonVariant - Bootstrap variant for confirm button
   * @returns {Promise<void>} - Resolves when confirmed, rejects when canceled
   */
  const confirm = (options = {}) => {
    return new Promise((resolve, reject) => {
      // Set options
      state.title.value = options.title || 'Confirm Action'
      state.message.value = options.message || 'Are you sure you want to proceed?'
      state.confirmText.value = options.confirmText || 'Confirm'
      state.cancelText.value = options.cancelText || 'Cancel'
      state.confirmButtonVariant.value = options.confirmButtonVariant || 'primary'

      // Store promise handlers
      state.resolvePromise = resolve
      state.rejectPromise = reject

      // Show dialog
      state.isVisible.value = true
    })
  }

  /**
   * Handle confirm action
   */
  const handleConfirm = () => {
    if (state.resolvePromise) {
      state.resolvePromise()
      resetDialog()
    }
  }

  /**
   * Handle cancel action
   */
  const handleCancel = () => {
    if (state.rejectPromise) {
      state.rejectPromise(new Error('User canceled'))
      resetDialog()
    }
  }

  /**
   * Reset dialog state
   */
  const resetDialog = () => {
    state.isVisible.value = false
    state.resolvePromise = null
    state.rejectPromise = null
  }

  return {
    // State (exported as refs)
    isVisible: state.isVisible,
    title: state.title,
    message: state.message,
    confirmText: state.confirmText,
    cancelText: state.cancelText,
    confirmButtonVariant: state.confirmButtonVariant,

    // Methods
    confirm,
    handleConfirm,
    handleCancel
  }
}
