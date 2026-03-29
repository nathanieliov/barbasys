import { Database } from 'better-sqlite3';
import { Product } from '../domain/entities.js';
import { IProductRepository, ProductIntelligence } from './product-repository.interface.js';

export class SQLiteProductRepository implements IProductRepository {
  constructor(private db: Database) {}

  async findAll(shopId: number): Promise<Product[]> {
    return this.db.prepare('SELECT * FROM products WHERE shop_id = ? AND is_active = 1').all(shopId) as Product[];
  }

  async findById(id: number): Promise<Product | null> {
    const result = this.db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(id);
    return (result as Product) || null;
  }

  async create(product: Omit<Product, 'id' | 'stock'>): Promise<number> {
    const result = this.db.prepare(
      'INSERT INTO products (name, price, min_stock_threshold, shop_id, stock) VALUES (?, ?, ?, ?, 0)'
    ).run(product.name, product.price, product.min_stock_threshold, product.shop_id);
    return Number(result.lastInsertRowid);
  }

  async update(product: Product): Promise<void> {
    this.db.prepare(
      'UPDATE products SET name = ?, price = ?, min_stock_threshold = ? WHERE id = ?'
    ).run(product.name, product.price, product.min_stock_threshold, product.id);
  }

  async delete(id: number): Promise<void> {
    this.db.prepare('UPDATE barbers SET is_active = 0 WHERE id = ?').run(id);
  }

  async reduceStock(id: number, amount: number, saleId: number): Promise<void> {
    const updateStock = this.db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
    const insertLog = this.db.prepare('INSERT INTO stock_logs (product_id, change_amount, type, reference_id) VALUES (?, ?, ?, ?)');

    const transaction = this.db.transaction((amt: number, pid: number, sid: number) => {
      updateStock.run(amt, pid);
      insertLog.run(pid, -amt, 'SALE', sid);
    });

    transaction(amount, id, saleId);
  }

  async restock(id: number, amount: number, reason: string): Promise<void> {

    const updateStock = this.db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
    const insertLog = this.db.prepare('INSERT INTO stock_logs (product_id, change_amount, type, reason) VALUES (?, ?, ?, ?)');
    
    const transaction = this.db.transaction((amt: number, pid: number, reas: string) => {
      updateStock.run(amt, pid);
      insertLog.run(pid, amt, 'RESTOCK', reas);
    });
    
    transaction(amount, id, reason);
  }

  async getIntelligence(shopId: number): Promise<ProductIntelligence[]> {
    return this.db.prepare(`
      SELECT
        p.id, p.name, p.stock, p.min_stock_threshold,
        IFNULL(AVG(daily_sales.units), 0) as avg_daily_velocity
      FROM products p
      LEFT JOIN (
        SELECT product_id, date(timestamp) as sale_date, COUNT(*) as units
        FROM stock_logs
        WHERE type = 'SALE' AND timestamp > date('now', '-30 days')
        GROUP BY product_id, sale_date
      ) daily_sales ON p.id = daily_sales.product_id
      WHERE p.shop_id = ? AND p.is_active = 1
      GROUP BY p.id
    `).all(shopId) as ProductIntelligence[];
  }
}
