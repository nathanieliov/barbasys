import { describe, it, expect, beforeAll } from 'vitest';
import db from '../../db.js';
import { SQLiteCustomerRepository } from '../../repositories/sqlite-customer-repository.js';
import { resolveCustomer } from './resolve-customer.js';

describe('resolveCustomer', () => {
  const repo = new SQLiteCustomerRepository(db);

  let existingCustomerId: number;

  beforeAll(async () => {
    existingCustomerId = await repo.create({
      name: 'Existing Customer',
      email: 'existing@example.com',
      phone: '+15551111111',
      birthday: null,
      notes: null,
    });
  });

  it('returns existing customer by phone', async () => {
    const result = await resolveCustomer(repo, '+15551111111');
    expect(result.id).toBe(existingCustomerId);
    expect(result.name).toBe('Existing Customer');
  });

  it('creates stub customer if not found', async () => {
    const newPhone = '+15559999999';
    const result = await resolveCustomer(repo, newPhone);

    expect(result.id).toBeGreaterThan(0);
    expect(result.phone).toBe(newPhone);
  });

  it('created stub has null name', async () => {
    const newPhone = '+15558888888';
    const result = await resolveCustomer(repo, newPhone);

    expect(result.name).toBeNull();
  });

  it('subsequent calls return same stub', async () => {
    const phone = '+15557777777';
    const result1 = await resolveCustomer(repo, phone);
    const result2 = await resolveCustomer(repo, phone);

    expect(result1.id).toBe(result2.id);
  });
});
