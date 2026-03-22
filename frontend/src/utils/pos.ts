export function calculatePOSTotals(cart: { price: number }[], tipAmount: number, discountAmount: number) {
  const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
  const total = Math.max(0, subtotal + tipAmount - discountAmount);
  return { subtotal, total };
}
