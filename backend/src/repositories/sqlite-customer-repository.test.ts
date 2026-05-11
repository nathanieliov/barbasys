import { describe, it, expect, beforeAll } from 'vitest';
import { SQLiteCustomerRepository } from './sqlite-customer-repository.js';
import db from '../db.js';

describe('SQLiteCustomerRepository', () => {
  const repo = new SQLiteCustomerRepository(db);
  let testShopId: number;

  beforeAll(() => {
    db.exec('DELETE FROM customers');
    const shop = db.prepare('INSERT INTO shops (name, phone) VALUES (?, ?)').run('Repo Test Shop', '+10000000001');
    testShopId = Number(shop.lastInsertRowid);
  });

  it('should create and find a customer', async () => {
    const id = await repo.create({ email: 'test@example.com', phone: '123456789' });
    expect(id).toBeGreaterThan(0);

    const customer = await repo.findByEmailOrPhone('test@example.com', null);
    expect(customer).toBeDefined();
    expect(customer?.email).toBe('test@example.com');
  });

  it('should find customer by phone', async () => {
    const customer = await repo.findByEmailOrPhone(null, '123456789');
    expect(customer).toBeDefined();
    expect(customer?.email).toBe('test@example.com');
  });

  it('should update last visit', async () => {
    const customer = await repo.findByEmailOrPhone('test@example.com', null);
    const initialVisit = customer?.last_visit;

    await repo.updateLastVisit(customer!.id);

    const updated = await repo.findByEmailOrPhone('test@example.com', null);
    expect(updated?.last_visit).not.toBe(initialVisit);
  });

  it('findOrCreateWalkIn creates a sentinel on first call and returns same id on second', async () => {
    const id1 = await repo.findOrCreateWalkIn(testShopId);
    const id2 = await repo.findOrCreateWalkIn(testShopId);
    expect(id1).toBeGreaterThan(0);
    expect(id1).toBe(id2);
  });

  it('walk-in sentinel does not appear in findAll results', async () => {
    await repo.findOrCreateWalkIn(testShopId);
    const list = await repo.findAll(testShopId);
    expect(list.every(c => !c.is_walkin)).toBe(true);
  });

  it('findByEmailOrPhone never returns the walk-in sentinel', async () => {
    // Insert a walk-in with an email to ensure the is_walkin filter is enforced
    db.prepare("INSERT INTO customers (name, email, phone, shop_id, is_walkin) VALUES ('Walk-in', 'walkin@test.internal', null, ?, 1)").run(testShopId);
    const found = await repo.findByEmailOrPhone('walkin@test.internal', null);
    expect(found).toBeNull();
  });
});
