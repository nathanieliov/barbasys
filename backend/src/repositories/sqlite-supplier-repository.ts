import { Database } from 'better-sqlite3';
import { Supplier } from '../domain/entities.js';
import { ISupplierRepository } from './supplier-repository.interface.js';

export class SQLiteSupplierRepository implements ISupplierRepository {
  constructor(private db: Database) {}

  async findAll(): Promise<Supplier[]> {
    return this.db.prepare('SELECT * FROM suppliers WHERE is_active = 1').all() as Supplier[];
  }

  async findById(id: number): Promise<Supplier | null> {
    const result = this.db.prepare('SELECT * FROM suppliers WHERE id = ? AND is_active = 1').get(id);
    return (result as Supplier) || null;
  }

  async create(supplier: Omit<Supplier, 'id' | 'is_active'>): Promise<number> {
    const result = this.db.prepare(
      'INSERT INTO suppliers (name, contact_name, email, phone, lead_time_days) VALUES (?, ?, ?, ?, ?)'
    ).run(supplier.name, supplier.contact_name, supplier.email, supplier.phone, supplier.lead_time_days);
    return Number(result.lastInsertRowid);
  }

  async update(supplier: Partial<Supplier> & { id: number }): Promise<void> {
    const existing = await this.findById(supplier.id);
    if (!existing) throw new Error('Supplier not found');

    const name = supplier.name ?? existing.name;
    const contact_name = supplier.contact_name ?? existing.contact_name;
    const email = supplier.email ?? existing.email;
    const phone = supplier.phone ?? existing.phone;
    const lead_time_days = supplier.lead_time_days ?? existing.lead_time_days;

    this.db.prepare(
      'UPDATE suppliers SET name = ?, contact_name = ?, email = ?, phone = ?, lead_time_days = ? WHERE id = ?'
    ).run(name, contact_name, email, phone, lead_time_days, supplier.id);
  }

  async delete(id: number): Promise<void> {
    this.db.prepare('UPDATE suppliers SET is_active = 0 WHERE id = ?').run(id);
  }
}
