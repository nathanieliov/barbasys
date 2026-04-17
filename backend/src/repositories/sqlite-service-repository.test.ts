import { describe, it, expect, beforeAll } from 'vitest';
import { SQLiteServiceRepository } from './sqlite-service-repository.js';
import db from '../db.js';

describe('SQLiteServiceRepository', () => {
  const repo = new SQLiteServiceRepository(db);

  beforeAll(() => {
    db.exec('DELETE FROM services');
  });

  it('should create and find a service', async () => {
    const id = await repo.create({ 
      name: 'Test Service', 
      description: 'Test Desc',
      price: 25, 
      duration_minutes: 30,
      shop_id: 1,
      is_active: 1
    });
    expect(id).toBeGreaterThan(0);

    const service = await repo.findById(id);
    expect(service).toBeDefined();
    expect(service?.name).toBe('Test Service');
    expect(service?.description).toBe('Test Desc');
  });

  it('should list all active services', async () => {
    const services = await repo.findAll();
    expect(services.length).toBeGreaterThan(0);
  });

  it('should update a service', async () => {
    const id = await repo.create({ name: 'Old', description: 'Old Desc', price: 10, duration_minutes: 10, shop_id: 1, is_active: 1 });
    await repo.update({ id, name: 'New', description: 'New Desc', price: 20, duration_minutes: 20, shop_id: 1, is_active: 1 });
    
    const service = await repo.findById(id);
    expect(service?.name).toBe('New');
    expect(service?.description).toBe('New Desc');
    expect(service?.price).toBe(20);
  });

  it('should delete (deactivate) a service', async () => {
    const id = await repo.create({ name: 'To Delete', description: 'Desc', price: 10, duration_minutes: 10, shop_id: 1, is_active: 1 });
    await repo.delete(id);
    
    const service = await repo.findById(id);
    expect(service).toBeNull();
  });
});
