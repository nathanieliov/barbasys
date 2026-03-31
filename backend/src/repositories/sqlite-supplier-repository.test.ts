import { describe, it, expect, beforeAll } from 'vitest';
import { SQLiteSupplierRepository } from './sqlite-supplier-repository.js';
import db from '../db.js';

describe('SQLiteSupplierRepository', () => {
  const repo = new SQLiteSupplierRepository(db);
  let shopId: number;

  beforeAll(() => {
    db.exec('DELETE FROM suppliers; DELETE FROM shops;');
    const shopResult = db.prepare('INSERT INTO shops (name) VALUES (?)').run('Test Shop');
    shopId = Number(shopResult.lastInsertRowid);
  });

  it('should create and find a supplier', async () => {
    const id = await repo.create({
      name: 'Supplier A',
      contact_name: 'John',
      email: 'a@ex.com',
      phone: '1234567',
      lead_time_days: 5,
      shop_id: shopId
    });
    expect(id).toBeGreaterThan(0);

    const supplier = await repo.findById(id);
    expect(supplier).toBeDefined();
    expect(supplier?.name).toBe('Supplier A');
  });

  it('should list all suppliers for a shop', async () => {
    const suppliers = await repo.findAll(shopId);
    expect(suppliers.length).toBe(1);
  });

  it('should update a supplier', async () => {
    const id = (await repo.findAll(shopId))[0].id;
    await repo.update({ id, name: 'Updated Supplier' });
    
    const supplier = await repo.findById(id);
    expect(supplier?.name).toBe('Updated Supplier');
  });

  it('should delete (deactivate) a supplier', async () => {
    const id = (await repo.findAll(shopId))[0].id;
    await repo.delete(id);
    
    const supplier = await repo.findById(id);
    expect(supplier).toBeNull();
  });
});
