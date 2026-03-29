import { Product } from '../domain/entities.js';

export interface ProductIntelligence {
  id: number;
  name: string;
  stock: number;
  min_stock_threshold: number;
  avg_daily_velocity: number;
}

export interface IProductRepository {
  findAll(shopId: number): Promise<Product[]>;
  findById(id: number): Promise<Product | null>;
  create(product: Omit<Product, 'id' | 'stock'>): Promise<number>;
  update(product: Product): Promise<void>;
  delete(id: number): Promise<void>;
  reduceStock(id: number, amount: number, saleId: number): Promise<void>;
  restock(id: number, amount: number, reason: string): Promise<void>;
  getIntelligence(shopId: number): Promise<ProductIntelligence[]>;
}
