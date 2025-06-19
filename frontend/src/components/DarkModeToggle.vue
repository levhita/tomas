<template>
  <!-- Dark mode toggle button for navbar navigation -->
  <li class="nav-item me-2">
    <!-- 
      Toggle button that switches between light and dark themes
      Shows sun icon in dark mode, moon icon in light mode
    -->
    <button class="btn btn-link nav-link" @click="toggleDarkMode" title="Toggle dark mode"
      :aria-label="isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'">
      <i class="bi" :class="isDarkMode ? 'bi-sun' : 'bi-moon'"></i>
    </button>
  </li>
</template>

<script setup>
/**
 * DarkModeToggle Component
 * 
 * A reusable toggle component for switching between light and dark themes.
 * Integrates with Bootstrap's data-bs-theme attribute system and persists
 * user preferences in localStorage.
 * 
 * Features:
 * - Toggles between light and dark themes
 * - Persists theme preference in localStorage
 * - Respects system preference if no saved preference exists
 * - Shows appropriate icon (sun for dark mode, moon for light mode)
 * - Accessible button with proper ARIA labels
 * - Integrates seamlessly with Bootstrap's theme system
 * 
 * Theme Management:
 * - Uses Bootstrap's `data-bs-theme` attribute on document element
 * - Saves preference as 'darkMode' in localStorage ('true'/'false')
 * - Falls back to system preference on first visit
 * 
 * Usage:
 * <DarkModeToggle />
 * 
 * Dependencies:
 * - Vue 3 Composition API
 * - Bootstrap CSS with theme support
 * - Bootstrap Icons (bi-sun, bi-moon)
 * - localStorage support
 * 
 * @component
 * @example
 * <template>
 *   <nav class="navbar">
 *     <ul class="navbar-nav">
 *       <DarkModeToggle />
 *     </ul>
 *   </nav>
 * </template>
 */

import { ref, onMounted } from 'vue'

/**
 * Reactive reference tracking current dark mode state
 * @type {import('vue').Ref<boolean>}
 */
const isDarkMode = ref(false)

/**
 * Toggles between light and dark themes
 * 
 * Performs the following actions:
 * 1. Toggles the internal dark mode state
 * 2. Updates the document's data-bs-theme attribute
 * 3. Saves the preference to localStorage
 * 
 * The theme change is applied immediately to the entire document,
 * affecting all Bootstrap components and custom CSS that respects
 * the data-bs-theme attribute.
 * 
 * @function toggleDarkMode
 * @returns {void}
 * 
 * @example
 * // Called when user clicks the toggle button
 * toggleDarkMode()
 */
function toggleDarkMode() {
  // Toggle the reactive state
  isDarkMode.value = !isDarkMode.value

  // Apply theme to document
  if (isDarkMode.value) {
    document.documentElement.setAttribute('data-bs-theme', 'dark')
  } else {
    document.documentElement.setAttribute('data-bs-theme', 'light')
  }

  // Persist preference to localStorage
  localStorage.setItem('darkMode', isDarkMode.value ? 'true' : 'false')
}

/**
 * Initialize theme on component mount
 * 
 * Checks for saved user preference in localStorage, and if none exists,
 * falls back to the system's preferred color scheme. This ensures a
 * consistent user experience across sessions and respects user preferences.
 * 
 * Priority order:
 * 1. Saved localStorage preference ('darkMode' key)
 * 2. System preference (prefers-color-scheme media query)
 * 3. Default to light mode
 * 
 * @function onMounted
 * @returns {void}
 */
onMounted(() => {
  // Check for saved user preference
  const savedDarkMode = localStorage.getItem('darkMode')

  if (savedDarkMode === 'true') {
    // User previously chose dark mode
    isDarkMode.value = true
    document.documentElement.setAttribute('data-bs-theme', 'dark')
  } else if (savedDarkMode === 'false') {
    // User previously chose light mode
    isDarkMode.value = false
    document.documentElement.setAttribute('data-bs-theme', 'light')
  } else if (savedDarkMode === null) {
    // No saved preference - check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    isDarkMode.value = prefersDark

    if (prefersDark) {
      document.documentElement.setAttribute('data-bs-theme', 'dark')
    } else {
      document.documentElement.setAttribute('data-bs-theme', 'light')
    }
  }
})
</script>
