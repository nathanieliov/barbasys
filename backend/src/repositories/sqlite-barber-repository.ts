import { Database } from 'better-sqlite3';
import { Barber } from '../domain/entities.js';
import { IBarberRepository } from './barber-repository.interface.js';

export class SQLiteBarberRepository implements IBarberRepository {
  constructor(private db: Database) {}

  async findAll(): Promise<Barber[]> {
    return this.db.prepare('SELECT * FROM barbers').all() as Barber[];
  }

  async findById(id: number): Promise<Barber | null> {
    return this.db.prepare('SELECT * FROM barbers WHERE id = ?').get(id) as Barber | null;
  }

  async create(barber: Omit<Barber, 'id'>): Promise<number> {
    const result = this.db.prepare(
      'INSERT INTO barbers (name, service_commission_rate, product_commission_rate) VALUES (?, ?, ?)'
    ).run(barber.name, barber.service_commission_rate, barber.product_commission_rate);
    return Number(result.lastInsertRowid);
  }
}
