/**
 * Currency Utilities
 * 
 * This module provides utility functions for handling currency-related operations
 * throughout the application. Using these shared functions ensures consistent
 * formatting and behavior across all components.
 */

/**
 * Format a number as currency with the provided symbol
 * 
 * @param {number} amount - The amount to format
 * @param {string} currencySymbol - The currency symbol to use (e.g., '$', '€', '¥')
 * @param {string} locale - The locale to use for formatting (defaults to user's locale)
 * @returns {string} The formatted currency string
 */
export function formatCurrency(amount, currencySymbol = '$', locale = undefined) {
  // Format with Intl.NumberFormat using a standard currency (USD)
  // Then replace the standard symbol with the provided symbol
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD', // Using USD as base, will replace the symbol
    currencyDisplay: 'narrowSymbol'
  }).format(amount).replace('$', currencySymbol);
}
