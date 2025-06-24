/**
 * useToast Composable
 * 
 * A Vue composable for showing toast notifications.
 * Provides a simple API for showing toast notifications across the application.
 * 
 * Usage:
 * ```
 * import { useToast } from '@/composables/useToast'
 * 
 * // In your component setup
 * const { showToast } = useToast()
 * 
 * // Use it like this
 * showToast({
 *   title: 'Success',
 *   message: 'Operation completed successfully!',
 *   variant: 'success',
 *   duration: 5000 // optional, defaults to 5000ms
 * })
 * ```
 * 
 * Available variants:
 * - primary: General information (blue)
 * - secondary: Less emphasized information (gray)
 * - success: Successful operations (green)
 * - danger: Errors or destructive operations (red)
 * - warning: Warnings or cautions (yellow)
 * - info: Informational messages (light blue)
 */

import { ref } from 'vue'

// Singleton state for toasts
const state = {
  toastComponent: null
}

export function useToast() {
  /**
   * Register the toast component instance
   * This should be called once from App.vue when the ToastNotification component is mounted
   */
  const registerToastComponent = (component) => {
    state.toastComponent = component
  }

  /**
   * Show a toast notification
   * 
   * @param {Object} options - Toast configuration
   * @param {string} options.title - Toast title
   * @param {string} options.message - Toast message
   * @param {string} options.variant - Bootstrap variant (primary, success, danger, etc.)
   * @param {number} options.duration - Duration in ms (default: 5000)
   */
  const showToast = (options) => {
    if (!state.toastComponent) {
      console.error('Toast component not registered. Call registerToastComponent first.')
      return
    }

    const toast = {
      title: options.title || 'Notification',
      message: options.message || '',
      variant: options.variant || '',
      duration: options.duration || 5000
    }

    state.toastComponent.addToast(toast)
  }

  return {
    registerToastComponent,
    showToast
  }
}
