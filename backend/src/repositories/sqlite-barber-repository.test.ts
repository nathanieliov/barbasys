import { describe, it, expect, beforeAll } from 'vitest';
import { SQLiteBarberRepository } from './sqlite-barber-repository.js';
import db from '../db.js';

describe('SQLiteBarberRepository', () => {
  const repo = new SQLiteBarberRepository(db);

  beforeAll(() => {
    db.exec('DELETE FROM barbers; DELETE FROM shops;');
    db.prepare('INSERT INTO shops (id, name) VALUES (1, \'Test Shop\')').run();
  });

  it('should create and find a barber', async () => {
    const id = await repo.create({ 
      name: 'Test Barber', 
      fullname: 'Test Barber Fullname',
      slug: null,
      payment_model: 'COMMISSION',
      service_commission_rate: 0.6, 
      product_commission_rate: 0.1, 
      fixed_amount: null,
      fixed_period: null,
      shop_id: 1,
      is_active: 1
    });
    expect(id).toBeGreaterThan(0);

    const barber = await repo.findById(id);
    expect(barber).toBeDefined();
    expect(barber?.name).toBe('Test Barber');
    expect(barber?.payment_model).toBe('COMMISSION');
  });

  it('should create and find a fixed model barber', async () => {
    const id = await repo.create({ 
      name: 'Fixed Barber', 
      fullname: 'Fixed Barber Fullname',
      slug: null,
      payment_model: 'FIXED',
      service_commission_rate: 0, 
      product_commission_rate: 0, 
      fixed_amount: 1500,
      fixed_period: 'MONTHLY',
      shop_id: 1,
      is_active: 1
    });
    expect(id).toBeGreaterThan(0);

    const barber = await repo.findById(id);
    expect(barber?.payment_model).toBe('FIXED');
    expect(barber?.fixed_amount).toBe(1500);
    expect(barber?.fixed_period).toBe('MONTHLY');
  });

  it('should list all active barbers', async () => {
    const barbers = await repo.findAll();
    expect(barbers.length).toBeGreaterThan(0);
  });

  it('should delete (deactivate) a barber', async () => {
    const id = await repo.create({ 
      name: 'To Delete', 
      fullname: 'To Delete Fullname',
      slug: null,
      payment_model: 'COMMISSION',
      service_commission_rate: 0.5, 
      product_commission_rate: 0.1, 
      fixed_amount: null,
      fixed_period: null,
      shop_id: 1,
      is_active: 1
    });
    
    await repo.delete(id);
    
    const barber = await repo.findById(id);
    expect(barber).toBeNull();
  });
});
