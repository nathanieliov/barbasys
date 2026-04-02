/**
 * Formats a number as currency using the provided symbol.
 * Defaults to '$' if no symbol is provided.
 */
export function formatCurrency(amount: number | string | undefined | null, symbol: string = '$'): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD', // Standard for formatting structure
  }).format(numericAmount).replace('$', symbol);
}
