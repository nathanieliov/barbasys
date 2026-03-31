import { ISupplierRepository } from '../../repositories/supplier-repository.interface.js';

export class DeleteSupplier {
  constructor(private supplierRepo: ISupplierRepository) {}

  async execute(id: number): Promise<void> {
    const existing = await this.supplierRepo.findById(id);
    if (!existing) throw new Error('Supplier not found');
    return this.supplierRepo.delete(id);
  }
}
