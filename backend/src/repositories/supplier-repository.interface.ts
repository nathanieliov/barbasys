import { Supplier } from '../domain/entities.js';

export interface ISupplierRepository {
  findAll(shopId: number): Promise<Supplier[]>;
  findById(id: number): Promise<Supplier | null>;
  create(supplier: Omit<Supplier, 'id' | 'is_active'> & { shop_id: number }): Promise<number>;
  update(supplier: Partial<Supplier> & { id: number }): Promise<void>;
  delete(id: number): Promise<void>;
}
