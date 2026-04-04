import { Database } from 'better-sqlite3';
import { Barber } from '../domain/entities.js';
import { IBarberRepository } from './barber-repository.interface.js';

export class SQLiteBarberRepository implements IBarberRepository {
  constructor(private db: Database) {}

  async findAll(): Promise<Barber[]> {
    return this.db.prepare('SELECT * FROM barbers WHERE is_active = 1').all() as Barber[];
  }

  async findById(id: number): Promise<Barber | null> {
    const result = this.db.prepare('SELECT * FROM barbers WHERE id = ?').get(id);
    return (result as Barber) || null;
  }

  async findBySlug(slug: string): Promise<Barber | null> {
    const result = this.db.prepare('SELECT * FROM barbers WHERE slug = ? AND is_active = 1').get(slug);
    return (result as Barber) || null;
  }

  async create(barber: Omit<Barber, 'id'>): Promise<number> {
    const result = this.db.prepare(
      'INSERT INTO barbers (name, fullname, slug, payment_model, service_commission_rate, product_commission_rate, fixed_amount, fixed_period, shop_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(barber.name, barber.fullname, barber.slug || null, barber.payment_model || 'COMMISSION', barber.service_commission_rate, barber.product_commission_rate, barber.fixed_amount, barber.fixed_period, barber.shop_id, barber.is_active ?? 1);
    return Number(result.lastInsertRowid);
  }

  async update(barber: Partial<Barber> & { id: number }): Promise<void> {
    const existing = await this.findById(barber.id);
    if (!existing) throw new Error('Barber not found');

    const name = barber.name ?? existing.name;
    const fullname = barber.fullname ?? existing.fullname;
    const slug = barber.slug ?? existing.slug;
    const payment_model = barber.payment_model ?? existing.payment_model;
    const service_commission_rate = barber.service_commission_rate ?? existing.service_commission_rate;
    const product_commission_rate = barber.product_commission_rate ?? existing.product_commission_rate;
    const fixed_amount = barber.fixed_amount ?? existing.fixed_amount;
    const fixed_period = barber.fixed_period ?? existing.fixed_period;

    this.db.prepare(
      'UPDATE barbers SET name = ?, fullname = ?, slug = ?, payment_model = ?, service_commission_rate = ?, product_commission_rate = ?, fixed_amount = ?, fixed_period = ? WHERE id = ?'
    ).run(name, fullname, slug, payment_model, service_commission_rate, product_commission_rate, fixed_amount, fixed_period, barber.id);
  }

  async delete(id: number): Promise<void> {
    this.db.prepare('UPDATE barbers SET is_active = 0 WHERE id = ?').run(id);
  }

  async getCommissions(startDate: string, endDate: string, shopId: number, barberId?: number): Promise<any[]> {
    const commissionsQuery = `
      SELECT b.id as barber_id, COALESCE(b.fullname, b.name) as name,
             b.payment_model, b.fixed_amount, b.fixed_period,
             b.service_commission_rate, b.product_commission_rate,
             IFNULL(SUM(CASE WHEN si.type = 'service' THEN si.price ELSE 0 END), 0) as total_service_sales,
             IFNULL(SUM(CASE WHEN si.type = 'product' THEN si.price ELSE 0 END), 0) as total_product_sales,
             IFNULL((SELECT SUM(tip_amount) FROM sales WHERE barber_id = b.id AND date(timestamp) BETWEEN ? AND ?), 0) as tips
      FROM barbers b
      LEFT JOIN sales s ON s.barber_id = b.id AND date(s.timestamp) BETWEEN ? AND ?
      LEFT JOIN sale_items si ON si.sale_id = s.id
      WHERE b.shop_id = ?
      ${barberId ? 'AND b.id = ?' : ''}
      GROUP BY b.id
    `;
    const params: any[] = [startDate, endDate, startDate, endDate, shopId];
    if (barberId) params.push(barberId);

    const rows = this.db.prepare(commissionsQuery).all(...params) as any[];

    // Process logic in JS for better precision and handling complex fixed model rules
    return rows.map(row => {
      let service_commission = 0;
      let product_commission = 0;

      if (row.payment_model === 'FIXED' && row.fixed_amount) {
        // Calculate fixed salary for the period (Owner pays Barber)
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        let periodDays = 30;
        if (row.fixed_period === 'WEEKLY') periodDays = 7;
        else if (row.fixed_period === 'BIWEEKLY') periodDays = 14;

        service_commission = (row.fixed_amount / periodDays) * diffDays;
      } else if (row.payment_model === 'FIXED_FEE' && row.fixed_amount) {
        // Barber pays Owner a fixed fee, keeps rest
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        let periodDays = 30;
        if (row.fixed_period === 'WEEKLY') periodDays = 7;
        else if (row.fixed_period === 'BIWEEKLY') periodDays = 14;

        const proRatedFee = (row.fixed_amount / periodDays) * diffDays;
        
        // Barber payout is all sales minus the fee
        service_commission = (row.total_service_sales + row.total_product_sales) - proRatedFee;
        product_commission = 0; // Already included in service_commission for this model simplify
      } else {
        service_commission = row.total_service_sales * row.service_commission_rate;
        product_commission = row.total_product_sales * row.product_commission_rate;
      }

      return {
        barber_id: row.barber_id,
        name: row.name,
        service_commission,
        product_commission,
        tips: row.tips,
        total_payout: service_commission + product_commission + row.tips
      };
    });
  }
}
