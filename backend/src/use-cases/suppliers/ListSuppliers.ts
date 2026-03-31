import { ISupplierRepository } from '../../repositories/supplier-repository.interface.js';
import { Supplier } from '../../domain/entities.js';

export class ListSuppliers {
  constructor(private supplierRepo: ISupplierRepository) {}

  async execute(): Promise<Supplier[]> {
    return this.supplierRepo.findAll();
  }
}
