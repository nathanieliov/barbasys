import { Database } from 'better-sqlite3';
import { Barber } from '../domain/entities.js';
import { IBarberRepository } from './barber-repository.interface.js';

export class SQLiteBarberRepository implements IBarberRepository {
  constructor(private db: Database) {}

  async findAll(): Promise<Barber[]> {
    return this.db.prepare('SELECT * FROM barbers WHERE is_active = 1').all() as Barber[];
  }

  async findById(id: number): Promise<Barber | null> {
    const result = this.db.prepare('SELECT * FROM barbers WHERE id = ? AND is_active = 1').get(id);
    return (result as Barber) || null;
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

  async getCommissions(startDate: string, endDate: string, shopId: number, barberId?: number): Promise<any[]> {
    const commissionsQuery = `
      SELECT b.id as barber_id, b.name,
             IFNULL(SUM(CASE WHEN si.type = 'service' THEN si.price * b.service_commission_rate ELSE 0 END), 0) as service_commission,
             IFNULL(SUM(CASE WHEN si.type = 'product' THEN si.price * b.product_commission_rate ELSE 0 END), 0) as product_commission,
             IFNULL((SELECT SUM(tip_amount) FROM sales WHERE barber_id = b.id AND date(timestamp) BETWEEN ? AND ?), 0) as tips,
             (IFNULL(SUM(CASE WHEN si.type = 'service' THEN si.price * b.service_commission_rate ELSE 0 END), 0) + 
              IFNULL(SUM(CASE WHEN si.type = 'product' THEN si.price * b.product_commission_rate ELSE 0 END), 0) + 
              IFNULL((SELECT SUM(tip_amount) FROM sales WHERE barber_id = b.id AND date(timestamp) BETWEEN ? AND ?), 0)) as total_payout
      FROM barbers b
      LEFT JOIN sales s ON s.barber_id = b.id AND date(s.timestamp) BETWEEN ? AND ?
      LEFT JOIN sale_items si ON si.sale_id = s.id
      WHERE b.shop_id = ?
      ${barberId ? 'AND b.id = ?' : ''}
      GROUP BY b.id
    `;
    const params: any[] = [startDate, endDate, startDate, endDate, startDate, endDate, shopId];
    if (barberId) params.push(barberId);

    return this.db.prepare(commissionsQuery).all(...params);

  }
}
