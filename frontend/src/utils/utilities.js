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

/**
 * Determine the transaction type based on account type and amount
 * 
 * For debit accounts:
 * - Positive amount = Income
 * - Negative amount = Expense
 * 
 * For credit accounts:
 * - Positive amount = Charge (increases debt)
 * - Negative amount = Payment (reduces debt)
 * 
 * @param {Object} transaction - Transaction object with account_type and amount
 * @returns {string} The transaction type: Income, Expense, Payment, or Charge
 */
export function formatTransactionType(transaction) {
  const { amount, account_type } = transaction;
  
  if (account_type === 'debit') {
    return amount > 0 ? 'Income' : 'Expense';
  } else if (account_type === 'credit') {
    return amount < 0 ? 'Payment' : 'Charge';
  }
}

function colorByTypeBackground(type) {
switch (type.toLowerCase()) {
    case 'income':
      return 'bg-income';
    case 'payment':
      return 'bg-payment';
    case 'expense' :
      return 'bg-expense';  
    case 'charge':
      return 'bg-charge';
    default:
      return '';
  }

}
export function colorByType(type, scope) {

  if(scope === 'text') {
    // Return text color class
    
    switch (type.toLowerCase()) {
      case 'income':
        return 'text-income';
      case 'payment':
        return 'text-payment';
      case 'expense':
        return 'text-expense';
      case 'charge':
        return 'text-charge';
      default:
        return '';
    }
  } else {
    return colorByTypeBackground(type);
  }
  
}