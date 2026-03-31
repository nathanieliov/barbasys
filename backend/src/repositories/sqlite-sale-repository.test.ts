import { describe, it, expect, beforeAll } from 'vitest';
import { SQLiteSaleRepository } from './sqlite-sale-repository.js';
import db from '../db.js';

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
