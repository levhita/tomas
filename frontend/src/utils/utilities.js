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

export function formatTransactionType({account_id, amount}) {
  // type accountid 1 = debit_card
  // type accountid 2 = credit_card

 
  switch(account_id) {
    case 1: // debit_card
      return amount > 0 ? 'Income' : 'Expense';
      break;
    case 2: // credit_card
      return amount < 0 ? 'Payment' : 'Charge';
    default:
      return transaction.description || 'Unknown'; 
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