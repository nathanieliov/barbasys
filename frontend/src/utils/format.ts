export function formatCurrency(amount: number | string | undefined | null, symbol: string = 'RD$'): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2
  }).format(numericAmount).replace('DOP', symbol).trim();
}

export function formatCompactCurrency(amount: number | string | undefined | null, symbol: string = 'RD$'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
  const abs = Math.abs(num);

  if (abs >= 1_000_000) {
    const val = num / 1_000_000;
    return `${symbol}${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    const val = num / 1_000;
    return `${symbol}${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}K`;
  }
  return formatCurrency(num, symbol);
}
