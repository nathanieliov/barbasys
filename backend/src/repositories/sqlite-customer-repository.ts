import { Database } from 'better-sqlite3';
import { Customer } from '../domain/entities.js';
import { ICustomerRepository } from './customer-repository.interface.js';

export class SQLiteCustomerRepository implements ICustomerRepository {
  constructor(private db: Database) {}

  async findByEmailOrPhone(email: string | null, phone: string | null): Promise<Customer | null> {
    if (!email && !phone) return null;
    const query = 'SELECT * FROM customers WHERE (email = ? AND email IS NOT NULL) OR (phone = ? AND phone IS NOT NULL)';
    const result = this.db.prepare(query).get(email, phone);
    return (result as Customer) || null;
  }

  async create(customer: Partial<Customer>): Promise<number> {
    const result = this.db.prepare(
      'INSERT INTO customers (email, phone, last_visit) VALUES (?, ?, ?)'
    ).run(customer.email || null, customer.phone || null, customer.last_visit || null);
    return Number(result.lastInsertRowid);
  }

  async updateLastVisit(id: number): Promise<void> {
    this.db.prepare('UPDATE customers SET last_visit = CURRENT_TIMESTAMP WHERE id = ?').run(id);
  }
}
