import { describe, it, expect, beforeAll } from 'vitest';
import { SQLiteUserRepository } from './sqlite-user-repository.js';
import db from '../db.js';

describe('SQLiteUserRepository', () => {
  const repo = new SQLiteUserRepository();

  beforeAll(() => {
    db.exec("DELETE FROM users WHERE username NOT IN ('admin', 'manager', 'barber')");
  });

  it('should create and find a user by id', async () => {
    const userData = {
      username: 'newuser',
      email: 'new@example.com',
      password_hash: 'hashed',
      role: 'BARBER' as const,
      barber_id: null,
      shop_id: 1
    };

    const user = await repo.create(userData);
    expect(user.id).toBeGreaterThan(0);
    expect(user.username).toBe('newuser');

    const found = await repo.findById(user.id);
    expect(found).toBeDefined();
    expect(found?.username).toBe('newuser');
  });

  it('should find a user by username', async () => {
    const user = await repo.findByUsername('newuser');
    expect(user).toBeDefined();
    expect(user?.email).toBe('new@example.com');
  });

  it('should find a user by email', async () => {
    const user = await repo.findByEmail('new@example.com');
    expect(user).toBeDefined();
    expect(user?.username).toBe('newuser');
  });

  it('should update shop_id', async () => {
    const user = await repo.findByUsername('newuser');
    await repo.updateShopId(user!.id, 2);
    
    const updated = await repo.findById(user!.id);
    expect(updated?.shop_id).toBe(2);
  });

  it('should return null if user not found', async () => {
    const found = await repo.findById(99999);
    expect(found).toBeNull();
  });
});
