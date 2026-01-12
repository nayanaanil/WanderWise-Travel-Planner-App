/**
 * Currency formatting utility
 * Converts prices to INR and formats consistently across the app
 */

// Fixed conversion rates (approximate)
const CONVERSION_RATES: Record<string, number> = {
  USD: 83.5,   // 1 USD = 83.5 INR
  EUR: 90.5,   // 1 EUR = 90.5 INR
  GBP: 105.5,  // 1 GBP = 105.5 INR
  INR: 1,      // Already in INR
};

/**
 * Converts a price from a source currency to INR
 * @param amount - The price amount
 * @param sourceCurrency - The source currency code (default: USD)
 * @returns The converted amount in INR
 */
export function convertToINR(amount: number, sourceCurrency: string = 'USD'): number {
  const rate = CONVERSION_RATES[sourceCurrency.toUpperCase()] || CONVERSION_RATES.USD;
  return Math.round(amount * rate);
}

/**
 * Formats a price in INR with the ₹ symbol and comma separators
 * @param amount - The price amount (will be converted to INR if not already)
 * @param sourceCurrency - The source currency code (default: USD)
 * @returns Formatted string like "₹83,500"
 */
export function formatINR(amount: number | undefined | null, sourceCurrency: string = 'USD'): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '₹0';
  }
  
  const inrAmount = convertToINR(amount, sourceCurrency);
  return `₹${inrAmount.toLocaleString('en-IN')}`;
}

/**
 * Formats a price with "total" suffix
 * @param amount - The price amount
 * @param sourceCurrency - The source currency code (default: USD)
 * @returns Formatted string like "₹83,500 total"
 */
export function formatINRTotal(amount: number | undefined | null, sourceCurrency: string = 'USD'): string {
  return `${formatINR(amount, sourceCurrency)} total`;
}





