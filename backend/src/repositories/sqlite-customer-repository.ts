import { Database } from 'better-sqlite3';
import { Customer } from '../domain/entities.js';
import { ICustomerRepository } from './customer-repository.interface.js';

export class SQLiteCustomerRepository implements ICustomerRepository {
  constructor(private db: Database) {}

  async findById(id: number, shopId?: number): Promise<Customer | null> {
    const query = shopId !== undefined
      ? 'SELECT * FROM customers WHERE id = ? AND shop_id = ?'
      : 'SELECT * FROM customers WHERE id = ?';
    const args = shopId !== undefined ? [id, shopId] : [id];
    return this.db.prepare(query).get(...args as [any]) as Customer | null;
  }

  async findByEmailOrPhone(email: string | null, phone: string | null, shopId?: number): Promise<Customer | null> {
    if (!email && !phone) return null;
    const shopFilter = shopId !== undefined ? ' AND shop_id = ?' : '';
    const query = `SELECT * FROM customers WHERE is_walkin = 0 AND ((email = ? AND email IS NOT NULL) OR (phone = ? AND phone IS NOT NULL))${shopFilter}`;
    const args: any[] = [email, phone];
    if (shopId !== undefined) args.push(shopId);
    const result = this.db.prepare(query).get(...args);
    return (result as Customer) || null;
  }

  async findAll(shopId: number): Promise<Customer[]> {
    return this.db.prepare('SELECT * FROM customers WHERE shop_id = ? AND (is_walkin = 0 OR is_walkin IS NULL) ORDER BY last_visit DESC').all(shopId) as Customer[];
  }

  async findOrCreateWalkIn(shopId: number): Promise<number> {
    const existing = this.db.prepare('SELECT id FROM customers WHERE shop_id = ? AND is_walkin = 1 LIMIT 1').get(shopId) as { id: number } | undefined;
    if (existing) return existing.id;
    const result = this.db.prepare(
      "INSERT INTO customers (name, shop_id, is_walkin) VALUES ('Walk-in', ?, 1)"
    ).run(shopId);
    return Number(result.lastInsertRowid);
  }

  async create(customer: Partial<Customer>): Promise<number> {
    const result = this.db.prepare(
      'INSERT INTO customers (name, email, phone, last_visit, birthday, shop_id) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      customer.name || null,
      customer.email || null,
      customer.phone || null,
      customer.last_visit || null,
      customer.birthday || null,
      (customer as any).shop_id || null
    );
    return Number(result.lastInsertRowid);
  }

  async update(customer: Partial<Customer> & { id: number }): Promise<void> {
    const columns = Object.keys(customer).filter(k => k !== 'id');
    const values = columns.map(k => (customer as any)[k]);
    const setClause = columns.map(k => `${k} = ?`).join(', ');

    this.db.prepare(`UPDATE customers SET ${setClause} WHERE id = ?`).run(...values, customer.id);
  }

  async updateLastVisit(id: number): Promise<void> {
    this.db.prepare('UPDATE customers SET last_visit = CURRENT_TIMESTAMP WHERE id = ?').run(id);
  }

  async setWaOptIn(customerId: number, optedIn: boolean): Promise<void> {
    this.db.prepare(
      'UPDATE customers SET wa_opt_in = ?, wa_opt_in_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(optedIn ? 1 : 0, customerId);
  }

  async setPreferredLanguage(customerId: number, language: 'es' | 'en'): Promise<void> {
    this.db.prepare('UPDATE customers SET preferred_language = ? WHERE id = ?').run(language, customerId);
  }
}
