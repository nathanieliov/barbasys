import { Database } from 'better-sqlite3';
import { Barber } from '../domain/entities.js';
import { IBarberRepository } from './barber-repository.interface.js';

export class SQLiteBarberRepository implements IBarberRepository {
  constructor(private db: Database) {}

  async findAll(): Promise<Barber[]> {
    return this.db.prepare('SELECT * FROM barbers WHERE is_active = 1').all() as Barber[];
  }

  async findById(id: number): Promise<Barber | null> {
    return this.db.prepare('SELECT * FROM barbers WHERE id = ? AND is_active = 1').get(id) as Barber | null;
  }

  async create(barber: Omit<Barber, 'id'>): Promise<number> {
    const result = this.db.prepare(
      'INSERT INTO barbers (name, service_commission_rate, product_commission_rate, shop_id) VALUES (?, ?, ?, ?)'
    ).run(barber.name, barber.service_commission_rate, barber.product_commission_rate, barber.shop_id);
    return Number(result.lastInsertRowid);
  }

  async delete(id: number): Promise<void> {
    this.db.prepare('UPDATE barbers SET is_active = 0 WHERE id = ?').run(id);
  }
}
