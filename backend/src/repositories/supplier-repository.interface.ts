import { Supplier } from '../domain/entities.js';

export interface ISupplierRepository {
  findAll(): Promise<Supplier[]>;
  findById(id: number): Promise<Supplier | null>;
  create(supplier: Omit<Supplier, 'id' | 'is_active'>): Promise<number>;
  update(supplier: Partial<Supplier> & { id: number }): Promise<void>;
  delete(id: number): Promise<void>;
}
