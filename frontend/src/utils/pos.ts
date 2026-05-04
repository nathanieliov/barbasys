export function calculatePOSTotals(cart: { price: number; quantity?: number }[], tipAmount: number, discountAmount: number, taxRate: number = 0) {
  const subtotal = cart.reduce((sum, item) => sum + item.price * (item.quantity ?? 1), 0);
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = taxableAmount * (taxRate / 100);
  const total = taxableAmount + taxAmount + tipAmount;
  return { subtotal, taxAmount, total };
}
