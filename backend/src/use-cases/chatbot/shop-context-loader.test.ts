import { describe, it, expect, beforeAll } from 'vitest';
import db from '../../db.js';
import { loadShopContext } from './shop-context-loader.js';

describe('loadShopContext', () => {
  let shopId: number;

  beforeAll(() => {
    const shop = db.prepare('INSERT INTO shops (name, phone) VALUES (?, ?)').run('Test Barber Shop', '+15551234567');
    shopId = shop.lastInsertRowid as number;

    db.prepare(
      'INSERT INTO services (name, description, price, duration_minutes, shop_id, is_active) VALUES (?, ?, ?, ?, ?, ?)',
    ).run('Haircut', 'Basic haircut', 25, 30, shopId, 1);

    db.prepare(
      'INSERT INTO services (name, description, price, duration_minutes, shop_id, is_active) VALUES (?, ?, ?, ?, ?, ?)',
    ).run('Inactive Service', 'Not available', 50, 60, shopId, 0);

    db.prepare(
      'INSERT INTO barbers (name, fullname, payment_model, service_commission_rate, product_commission_rate, shop_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run('Carlos', 'Carlos Mendez', 'COMMISSION', 0.2, 0.15, shopId, 1);

    db.prepare(
      'INSERT INTO barbers (name, fullname, payment_model, service_commission_rate, product_commission_rate, shop_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run('Inactive Barber', 'Inactive B', 'COMMISSION', 0.2, 0.15, shopId, 0);
  });

  it('loads shop context', async () => {
    const context = await loadShopContext(shopId);

    expect(context.shopName).toBe('Test Barber Shop');
    expect(context.activeServices).toHaveLength(1);
    expect(context.activeServices[0].name).toBe('Haircut');
    expect(context.activeBarbers).toHaveLength(1);
    expect(context.activeBarbers[0].name).toBe('Carlos');
  });

  it('excludes inactive services and barbers', async () => {
    const context = await loadShopContext(shopId);

    expect(context.activeServices.map((s) => s.name)).not.toContain('Inactive Service');
    expect(context.activeBarbers.map((b) => b.name)).not.toContain('Inactive Barber');
  });

  it('includes service details', async () => {
    const context = await loadShopContext(shopId);

    expect(context.activeServices[0]).toMatchObject({
      id: expect.any(Number),
      name: 'Haircut',
      price: 25,
      duration_minutes: 30,
    });
  });
});
