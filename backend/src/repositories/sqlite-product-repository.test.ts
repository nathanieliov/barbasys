import { describe, it, expect, beforeAll } from 'vitest';
import { SQLiteProductRepository } from './sqlite-product-repository.js';
import db from '../db.js';

describe('SQLiteProductRepository', () => {
  const repo = new SQLiteProductRepository(db);

  beforeAll(() => {
    db.exec('DELETE FROM products');
  });

  it('should create and find a product', async () => {
    const id = await repo.create({ 
      name: 'Test Product', 
      price: 15, 
      min_stock_threshold: 2,
      shop_id: 1,
      supplier_id: null,
      is_active: 1
    });
    expect(id).toBeGreaterThan(0);

    const product = await repo.findById(id);
    expect(product).toBeDefined();
    expect(product?.name).toBe('Test Product');
  });

  it('should list all active products', async () => {
    const products = await repo.findAll(1);
    expect(products.length).toBeGreaterThan(0);
  });

  it('should update a product', async () => {
    const id = await repo.create({ 
      name: 'Old', 
      price: 10, 
      min_stock_threshold: 1, 
      shop_id: 1,
      supplier_id: null,
      is_active: 1
    });
    await repo.update({ 
      id, 
      name: 'New', 
      price: 20, 
      min_stock_threshold: 2, 
      shop_id: 1, 
      stock: 0,
      supplier_id: null,
      is_active: 1
    });
    
    const product = await repo.findById(id);
    expect(product?.name).toBe('New');
    expect(product?.price).toBe(20);
  });

  it('should delete (deactivate) a product', async () => {
    const id = await repo.create({ 
      name: 'To Delete', 
      price: 10, 
      min_stock_threshold: 1, 
      shop_id: 1,
      supplier_id: null,
      is_active: 1
    });
    await repo.delete(id);
    
    const product = await repo.findById(id);
    expect(product).toBeNull();
  });

  it('should handle stock reduction and restock', async () => {
    const id = await repo.create({ 
      name: 'Stock Test', 
      price: 10, 
      min_stock_threshold: 1, 
      shop_id: 1,
      supplier_id: null,
      is_active: 1
    });
    await repo.restock(id, 10, 'Initial restock');
    
    let product = await repo.findById(id);
    expect(product?.stock).toBe(10);

    await repo.reduceStock(id, 3, 101);
    product = await repo.findById(id);
    expect(product?.stock).toBe(7);
  });
});
