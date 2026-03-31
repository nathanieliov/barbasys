import { describe, it, expect, beforeAll } from 'vitest';
import { SQLiteCustomerRepository } from './sqlite-customer-repository.js';
import db from '../db.js';

describe('SQLiteCustomerRepository', () => {
  const repo = new SQLiteCustomerRepository(db);

  beforeAll(() => {
    db.exec('DELETE FROM customers');
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
});
