import { describe, it, expect, beforeAll } from 'vitest';
import db from '../db.js';
import { SQLiteSaleRepository } from './sqlite-sale-repository.js';

describe('SQLiteSaleRepository.updateContactInfo', () => {
  let repo: SQLiteSaleRepository;
  let shopId: number;
  let barberId: number;
  let saleId: number;

  beforeAll(async () => {
    repo = new SQLiteSaleRepository(db);
    const shop = db.prepare('INSERT INTO shops (name, phone) VALUES (?, ?)').run('Receipt Test', '+15550000000');
    shopId = shop.lastInsertRowid as number;
    const barber = db.prepare('INSERT INTO barbers (name, fullname, payment_model, service_commission_rate, product_commission_rate, shop_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run('Carlos', 'Carlos R', 'COMMISSION', 0.2, 0.15, shopId, 1);
    barberId = barber.lastInsertRowid as number;
    saleId = await repo.create(
      { barber_id: barberId, barber_name: 'Carlos R', customer_id: null, total_amount: 30, tip_amount: 0, tax_amount: 0, discount_amount: 0, customer_email: null, customer_phone: null, shop_id: shopId },
      [{ item_id: 1, item_name: 'Cut', type: 'service', price: 30 }]
    );
  });

  it('sets only email when only email is provided', async () => {
    await repo.updateContactInfo(saleId, 'alice@example.com', null);
    const row = await repo.findById(saleId);
    expect(row?.customer_email).toBe('alice@example.com');
    expect(row?.customer_phone).toBeNull();
  });

  it('sets only phone when only phone is provided', async () => {
    await repo.updateContactInfo(saleId, null, '+15551234567');
    const row = await repo.findById(saleId);
    expect(row?.customer_phone).toBe('+15551234567');
    expect(row?.customer_email).toBe('alice@example.com'); // unchanged from previous test
  });

  it('sets both when both are provided', async () => {
    await repo.updateContactInfo(saleId, 'bob@example.com', '+15559999999');
    const row = await repo.findById(saleId);
    expect(row?.customer_email).toBe('bob@example.com');
    expect(row?.customer_phone).toBe('+15559999999');
  });

  it('is a no-op when both are null', async () => {
    const before = await repo.findById(saleId);
    await repo.updateContactInfo(saleId, null, null);
    const after = await repo.findById(saleId);
    expect(after?.customer_email).toBe(before?.customer_email);
    expect(after?.customer_phone).toBe(before?.customer_phone);
  });
});
