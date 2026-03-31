import { describe, it, expect, beforeAll } from 'vitest';
import { SQLiteExpenseRepository } from './sqlite-expense-repository.js';
import db from '../db.js';

describe('SQLiteExpenseRepository', () => {
  const repo = new SQLiteExpenseRepository(db);

  beforeAll(() => {
    db.exec('DELETE FROM expenses');
    db.prepare('INSERT INTO expenses (category, amount, shop_id, date) VALUES (\'Rent\', 1000, 1, \'2026-03-01\')').run();
    db.prepare('INSERT INTO expenses (category, amount, shop_id, date) VALUES (\'Supplies\', 200, 1, \'2026-03-15\')').run();
  });

  it('should calculate total expenses in range', async () => {
    const total = await repo.getTotalInRange('2026-03-01', '2026-03-31', 1);
    expect(total).toBe(1200);
  });

  it('should return 0 for range with no expenses', async () => {
    const total = await repo.getTotalInRange('2026-04-01', '2026-04-30', 1);
    expect(total).toBe(0);
  });
});
