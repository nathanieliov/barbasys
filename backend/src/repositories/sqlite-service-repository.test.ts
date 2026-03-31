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
      price: 25, 
      duration_minutes: 30,
      shop_id: 1 
    });
    expect(id).toBeGreaterThan(0);

    const service = await repo.findById(id);
    expect(service).toBeDefined();
    expect(service?.name).toBe('Test Service');
  });

  it('should list all active services', async () => {
    const services = await repo.findAll();
    expect(services.length).toBeGreaterThan(0);
  });

  it('should update a service', async () => {
    const id = await repo.create({ name: 'Old', price: 10, duration_minutes: 10, shop_id: 1 });
    await repo.update({ id, name: 'New', price: 20, duration_minutes: 20, shop_id: 1 });
    
    const service = await repo.findById(id);
    expect(service?.name).toBe('New');
    expect(service?.price).toBe(20);
  });

  it('should delete (deactivate) a service', async () => {
    const id = await repo.create({ name: 'To Delete', price: 10, duration_minutes: 10, shop_id: 1 });
    await repo.delete(id);
    
    const service = await repo.findById(id);
    expect(service).toBeNull();
  });
});
