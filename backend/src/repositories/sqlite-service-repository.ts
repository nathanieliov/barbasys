import { Database } from 'better-sqlite3';
import { Service } from '../domain/entities.js';
import { IServiceRepository } from './service-repository.interface.js';

export class SQLiteServiceRepository implements IServiceRepository {
  constructor(private db: Database) {}

  async findAll(): Promise<Service[]> {
    return this.db.prepare('SELECT * FROM services').all() as Service[];
  }

  async findById(id: number): Promise<Service | null> {
    const result = this.db.prepare('SELECT * FROM services WHERE id = ?').get(id);
    return (result as Service) || null;
  }

  async create(service: Omit<Service, 'id'>): Promise<number> {
    const result = this.db.prepare(
      'INSERT INTO services (name, price, duration_minutes) VALUES (?, ?, ?)'
    ).run(service.name, service.price, service.duration_minutes);
    return Number(result.lastInsertRowid);
  }

  async update(service: Service): Promise<void> {
    this.db.prepare(
      'UPDATE services SET name = ?, price = ?, duration_minutes = ? WHERE id = ?'
    ).run(service.name, service.price, service.duration_minutes, service.id);
  }

  async delete(id: number): Promise<void> {
    this.db.prepare('DELETE FROM services WHERE id = ?').run(id);
  }
}
