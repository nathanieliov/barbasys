import { describe, it, expect } from 'vitest';
import {
  validateTip,
  sanitizeTipInput,
  normalizeTipOnBlur,
  addTicketItem,
  removeTicketItem,
  ticketSubtotal,
  type TicketItem,
} from './barber-mode';

// ─── sanitizeTipInput ────────────────────────────────────────

describe('sanitizeTipInput', () => {
  it('strips non-digit/non-dot characters', () => {
    expect(sanitizeTipInput('$12')).toBe('12');
    expect(sanitizeTipInput('abc')).toBe('');
    expect(sanitizeTipInput('12abc')).toBe('12');
  });

  it('strips minus signs so negative values cannot be typed', () => {
    expect(sanitizeTipInput('-5')).toBe('5');
    expect(sanitizeTipInput('-')).toBe('');
  });

  it('allows only one decimal point', () => {
    expect(sanitizeTipInput('12.5.3')).toBe('12.53');
    expect(sanitizeTipInput('1..5')).toBe('1.5');
  });

  it('caps to 2 decimal places', () => {
    expect(sanitizeTipInput('12.999')).toBe('12.99');
    expect(sanitizeTipInput('5.123')).toBe('5.12');
  });

  it('passes through clean values unchanged', () => {
    expect(sanitizeTipInput('10.50')).toBe('10.50');
    expect(sanitizeTipInput('0')).toBe('0');
    expect(sanitizeTipInput('')).toBe('');
  });
});

// ─── normalizeTipOnBlur ───────────────────────────────────────

describe('normalizeTipOnBlur', () => {
  it('normalizes empty string to "0.00"', () => {
    expect(normalizeTipOnBlur('')).toBe('0.00');
    expect(normalizeTipOnBlur('   ')).toBe('0.00');
  });

  it('normalizes bare decimal to "0.00"', () => {
    expect(normalizeTipOnBlur('.')).toBe('0.00');
  });

  it('normalizes trailing decimal to full precision', () => {
    expect(normalizeTipOnBlur('12.')).toBe('12.00');
  });

  it('normalizes single decimal place to two', () => {
    expect(normalizeTipOnBlur('12.5')).toBe('12.50');
  });

  it('formats whole number with two decimal places', () => {
    expect(normalizeTipOnBlur('10')).toBe('10.00');
  });

  it('resets negative to "0.00"', () => {
    expect(normalizeTipOnBlur('-5')).toBe('0.00');
  });
});

// ─── validateTip ─────────────────────────────────────────────

describe('validateTip', () => {
  it('returns valid with value 0 for empty string', () => {
    const result = validateTip('', 100);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.value).toBe(0);
  });

  it('rejects negative values', () => {
    const result = validateTip('-5', 100);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toMatch(/negative/i);
  });

  it('rejects tip exceeding cap on a large ticket', () => {
    // subtotal=$200, cap=$200; tip=$201 → error
    const result = validateTip('201', 200);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toMatch(/higher than this ticket/i);
      expect(result.error).toContain('200.00');
    }
  });

  it('uses $50 floor cap for small tickets', () => {
    // subtotal=$20, cap=max(50,20)=$50; tip=$51 → error
    const result = validateTip('51', 20);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain('50.00');
  });

  it('allows tip exactly at cap', () => {
    // subtotal=$20, cap=$50; tip=$50 → valid
    const result = validateTip('50', 20);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.value).toBe(50);
  });

  it('allows tip exactly at large-ticket cap', () => {
    // subtotal=$200, cap=$200; tip=$200 → valid
    const result = validateTip('200', 200);
    expect(result.valid).toBe(true);
  });

  it('accepts a valid decimal tip', () => {
    const result = validateTip('12.50', 100);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.value).toBeCloseTo(12.5);
  });

  it('uses custom currency symbol in error message', () => {
    const result = validateTip('200', 20, 'RD$');
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain('RD$');
  });
});

// ─── Ticket mutation ──────────────────────────────────────────

const svc = (id: number, name: string, price: number): Omit<TicketItem, 'cartId' | 'qty'> => ({
  id,
  name,
  type: 'service',
  price,
});

describe('addTicketItem', () => {
  it('appends a new item with qty 1', () => {
    const ticket = addTicketItem([], svc(1, 'Fade', 25));
    expect(ticket).toHaveLength(1);
    expect(ticket[0]).toMatchObject({ id: 1, name: 'Fade', qty: 1, cartId: 'service-1' });
  });

  it('increments qty when the same item is added again', () => {
    const after1 = addTicketItem([], svc(1, 'Fade', 25));
    const after2 = addTicketItem(after1, svc(1, 'Fade', 25));
    expect(after2).toHaveLength(1);
    expect(after2[0].qty).toBe(2);
  });

  it('treats service and product with same id as distinct items', () => {
    const t1 = addTicketItem([], svc(1, 'Fade', 25));
    const t2 = addTicketItem(t1, { id: 1, name: 'Pomade', type: 'product', price: 15 });
    expect(t2).toHaveLength(2);
  });

  it('does not mutate the original ticket array', () => {
    const original: TicketItem[] = [];
    addTicketItem(original, svc(1, 'Fade', 25));
    expect(original).toHaveLength(0);
  });
});

describe('removeTicketItem', () => {
  it('removes the item with the given cartId', () => {
    const ticket = addTicketItem(addTicketItem([], svc(1, 'Fade', 25)), svc(2, 'Beard', 15));
    const result = removeTicketItem(ticket, 'service-1');
    expect(result).toHaveLength(1);
    expect(result[0].cartId).toBe('service-2');
  });

  it('leaves ticket unchanged when cartId is not found', () => {
    const ticket = addTicketItem([], svc(1, 'Fade', 25));
    const result = removeTicketItem(ticket, 'service-99');
    expect(result).toHaveLength(1);
  });

  it('does not mutate the original ticket', () => {
    const ticket = addTicketItem([], svc(1, 'Fade', 25));
    removeTicketItem(ticket, 'service-1');
    expect(ticket).toHaveLength(1);
  });
});

// ─── ticketSubtotal ───────────────────────────────────────────

describe('ticketSubtotal', () => {
  it('returns 0 for empty ticket', () => {
    expect(ticketSubtotal([])).toBe(0);
  });

  it('sums price × qty for all items', () => {
    const ticket: TicketItem[] = [
      { cartId: 'service-1', id: 1, name: 'Fade', type: 'service', price: 25, qty: 2 },
      { cartId: 'product-1', id: 1, name: 'Pomade', type: 'product', price: 15, qty: 1 },
    ];
    expect(ticketSubtotal(ticket)).toBe(65);
  });
});
