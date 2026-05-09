import { describe, it, expect, beforeAll } from 'vitest';
import db from '../db.js';
import { SQLiteSaleRepository } from './sqlite-sale-repository.js';

describe('SQLiteSaleRepository', () => {
  const repo = new SQLiteSaleRepository(db);
  let shopId: number;
  let barberId: number;

  beforeAll(() => {
    db.exec('DELETE FROM sale_items; DELETE FROM sales; DELETE FROM barbers; DELETE FROM shops;');
    const shopResult = db.prepare('INSERT INTO shops (name) VALUES (?)').run('Test Shop');
    shopId = Number(shopResult.lastInsertRowid);
    const barberResult = db.prepare('INSERT INTO barbers (name, shop_id) VALUES (?, ?)').run('Nathaniel', shopId);
    barberId = Number(barberResult.lastInsertRowid);
  });

  it('should create a sale and find it by id', async () => {
    const saleData = {
      barber_id: barberId,
      barber_name: 'Nathaniel',
      customer_id: null,
      total_amount: 50,
      tip_amount: 10,
      tax_amount: 5,
      discount_amount: 0,
      customer_email: 'test@example.com',
      customer_phone: null,
      shop_id: shopId
    };

    const items = [
      { item_id: 1, item_name: 'Haircut', type: 'service' as const, price: 40 }
    ];

    const saleId = await repo.create(saleData, items);
    expect(saleId).toBeGreaterThan(0);

    const sale = await repo.findById(saleId);
    expect(sale).toBeDefined();
    expect(sale?.total_amount).toBe(50);
    expect(sale?.barber_name).toBe('Nathaniel');
  });

  it('should return null for non-existent sale', async () => {
    const sale = await repo.findById(99999);
    expect(sale).toBeNull();
  });

  it('should find sales in range with and without barberId', async () => {
    const today = new Date().toISOString().split('T')[0];

    const res1 = await repo.findInRange(today, today, shopId);
    expect(res1.total).toBe(50);
    expect(res1.tips).toBe(10);

    const res2 = await repo.findInRange(today, today, shopId, barberId);
    expect(res2.total).toBe(50);

    const res3 = await repo.findInRange(today, today, shopId, 999);
    expect(res3.total).toBe(0);
  });

  it('should find detailed sales in range', async () => {
    const today = new Date().toISOString().split('T')[0];

    const detailed = await repo.findDetailedInRange(today, today, shopId);
    expect(detailed.length).toBe(1);
    expect(detailed[0].items.length).toBe(1);
    expect(detailed[0].items[0].item_name).toBe('Haircut');

    const detailedWithBarber = await repo.findDetailedInRange(today, today, shopId, barberId);
    expect(detailedWithBarber.length).toBe(1);
  });
});

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
    expect(row?.customer_email).toBe('alice@example.com');
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
