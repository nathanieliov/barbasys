/**
 * Formats a number as currency using the provided symbol.
 * Defaults to '$' if no symbol is provided.
 */
export function formatCurrency(amount: number | string | undefined | null, symbol: string = 'RD$'): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
  
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2
  }).format(numericAmount).replace('DOP', symbol).trim();
}
