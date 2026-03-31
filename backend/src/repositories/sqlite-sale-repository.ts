import { Database } from 'better-sqlite3';
import { Sale, SaleItem } from '../domain/entities.js';
import { ISaleRepository } from './sale-repository.interface.js';

export class SQLiteSaleRepository implements ISaleRepository {
  constructor(private db: Database) {}

  async create(sale: Omit<Sale, 'id' | 'timestamp'>, items: Omit<SaleItem, 'id' | 'sale_id'>[]): Promise<number> {
    const insertSale = this.db.prepare(`
      INSERT INTO sales (barber_id, barber_name, customer_id, total_amount, tip_amount, discount_amount, customer_email, customer_phone, shop_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertItem = this.db.prepare(`
      INSERT INTO sale_items (sale_id, item_id, item_name, type, price)
      VALUES (?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction((s: any, its: any[]) => {
      const result = insertSale.run(
        s.barber_id,
        s.barber_name,
        s.customer_id,
        s.total_amount,
        s.tip_amount,
        s.discount_amount,
        s.customer_email,
        s.customer_phone,
        s.shop_id
      );
      const saleId = Number(result.lastInsertRowid);

      for (const item of its) {
        insertItem.run(saleId, item.item_id, item.item_name, item.type, item.price);
      }

      return saleId;
    });

    return transaction(sale, items);
  }

  async findById(id: number): Promise<Sale | null> {
    const result = this.db.prepare('SELECT * FROM sales WHERE id = ?').get(id);
    return (result as Sale) || null;
  }

  async findInRange(startDate: string, endDate: string, shopId: number, barberId?: number | null): Promise<{ total: number, tips: number }> {
    let query = 'SELECT SUM(total_amount) as total, SUM(tip_amount) as tips FROM sales WHERE date(timestamp) BETWEEN ? AND ? AND shop_id = ?';
    const params: any[] = [startDate, endDate, shopId];

    if (barberId !== undefined) {
      query += ' AND barber_id = ?';
      params.push(barberId);
    }

    const result = this.db.prepare(query).get(...params) as { total: number, tips: number };
    return {
      total: result?.total || 0,
      tips: result?.tips || 0
    };
  }

  async findDetailedInRange(startDate: string, endDate: string, shopId: number, barberId?: number | null): Promise<(Sale & { items: SaleItem[] })[]> {
    let query = 'SELECT * FROM sales WHERE date(timestamp) BETWEEN ? AND ? AND shop_id = ?';
    const params: any[] = [startDate, endDate, shopId];

    if (barberId !== undefined) {
      query += ' AND barber_id = ?';
      params.push(barberId);
    }

    query += ' ORDER BY timestamp DESC';

    const sales = this.db.prepare(query).all(...params) as Sale[];
    const salesWithItems: (Sale & { items: SaleItem[] })[] = [];

    const itemQuery = this.db.prepare('SELECT * FROM sale_items WHERE sale_id = ?');

    for (const sale of sales) {
      const items = itemQuery.all(sale.id) as SaleItem[];
      salesWithItems.push({ ...sale, items });
    }

    return salesWithItems;
  }
}
