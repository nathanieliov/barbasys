import { describe, it, expect } from 'vitest';
import { calculatePOSTotals } from './pos';

describe('POS Calculation Utils', () => {
  it('should calculate standard total with tip and discount', () => {
    const cart = [{ price: 25 }, { price: 18 }]; // $43
    const { subtotal, total } = calculatePOSTotals(cart, 5, 3);
    expect(subtotal).toBe(43);
    expect(total).toBe(45); // 43 + 5 - 3
  });

  it('should floor total at 0 if discount is greater than subtotal', () => {
    const cart = [{ price: 20 }];
    const { subtotal, total } = calculatePOSTotals(cart, 0, 25);
    expect(subtotal).toBe(20);
    expect(total).toBe(0);
  });

  it('should handle empty cart correctly', () => {
    const { subtotal, total } = calculatePOSTotals([], 0, 0);
    expect(subtotal).toBe(0);
    expect(total).toBe(0);
  });

  it('should handle only tip', () => {
    const cart = [{ price: 10 }];
    const { total } = calculatePOSTotals(cart, 5, 0);
    expect(total).toBe(15);
  });
});
