import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from './index.js';
import db from './db.js';

describe('Inventory Professional Audit System', () => {
  let productId: number;
  let token: string;

  beforeAll(async () => {
    db.exec('DELETE FROM stock_logs; DELETE FROM sale_items; DELETE FROM sales; DELETE FROM products;');
    const res = db.prepare('INSERT INTO products (name, price, stock, min_stock_threshold) VALUES (?, ?, ?, ?)').run('Pomade', 18, 5, 2);
    productId = Number(res.lastInsertRowid);

    // Login to get token
    const loginRes = await request(app).post('/api/auth/login').send({
      username: 'admin',
      password: 'admin123'
    });
    token = loginRes.body.token;
  });

  it('should maintain an audit trail and prevent negative stock', async () => {
    // 1. Initial restock
    await request(app).post('/api/inventory/restock').set('Authorization', `Bearer ${token}`).send({
      product_id: productId,
      amount: 10,
      reason: 'Audit Test'
    });

    // Stock should be 5 + 10 = 15
    const productBefore = db.prepare('SELECT stock FROM products WHERE id = ?').get(productId) as any;
    expect(productBefore.stock).toBe(15);

    // 2. Perform a sale
    const barbersRes = await request(app).get('/api/barbers').set('Authorization', `Bearer ${token}`);
    const barberId = barbersRes.body[0].id;

    await request(app).post('/api/sales').set('Authorization', `Bearer ${token}`).send({
      barber_id: barberId,
      items: [{ id: productId, type: 'product', price: 18 }]
    });

    // Stock should be 14
    const productAfter = db.prepare('SELECT stock FROM products WHERE id = ?').get(productId) as any;
    expect(productAfter.stock).toBe(14);

    // 3. Verify Audit Logs
    const logs = db.prepare('SELECT * FROM stock_logs WHERE product_id = ?').all(productId) as any[];
    expect(logs).toHaveLength(2);
    expect(logs[0].type).toBe('RESTOCK');
    expect(logs[0].change_amount).toBe(10);
    expect(logs[1].type).toBe('SALE');
    expect(logs[1].change_amount).toBe(-1);

    // 4. Test Constraint (Attempt to sell more than available)
    db.prepare('UPDATE products SET stock = 0 WHERE id = ?').run(productId);
    
    const failSale = await request(app).post('/api/sales').set('Authorization', `Bearer ${token}`).send({
      barber_id: barberId,
      items: [{ id: productId, type: 'product', price: 18 }]
    });

    expect(failSale.status).toBe(400); // Business rule/Constraint violation
    const finalStock = db.prepare('SELECT stock FROM products WHERE id = ?').get(productId) as any;
    expect(finalStock.stock).toBe(0); // Should remain 0
  });
});
