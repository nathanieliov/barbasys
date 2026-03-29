import { Database } from 'better-sqlite3';
import { IExpenseRepository } from './expense-repository.interface.js';

export class SQLiteExpenseRepository implements IExpenseRepository {
  constructor(private db: Database) {}

  async getTotalInRange(startDate: string, endDate: string, shopId: number): Promise<number> {
    const result = this.db.prepare(
      'SELECT SUM(amount) as total FROM expenses WHERE date(date) BETWEEN ? AND ? AND shop_id = ?'
    ).get(startDate, endDate, shopId) as { total: number };
    return result?.total || 0;
  }
}
