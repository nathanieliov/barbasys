import { Sale, SaleItem } from '../domain/entities.js';

export interface ISaleRepository {
  create(sale: Omit<Sale, 'id' | 'timestamp'>, items: Omit<SaleItem, 'id' | 'sale_id'>[]): Promise<number>;
  findById(id: number): Promise<Sale | null>;
  findInRange(startDate: string, endDate: string, shopId: number, barberId?: number): Promise<{ total: number, tips: number }>;
}
