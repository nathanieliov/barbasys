import { ISupplierRepository } from '../../repositories/supplier-repository.interface.js';
import { Supplier } from '../../domain/entities.js';

export interface UpdateSupplierRequest {
  id: number;
  name?: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  lead_time_days?: number;
}

export class UpdateSupplier {
  constructor(private supplierRepo: ISupplierRepository) {}

  async execute(request: UpdateSupplierRequest): Promise<void> {
    if (request.phone) {
      const phoneRegex = /^[\d\s\+\-\(\)]{7,}$/;
      if (!phoneRegex.test(request.phone)) {
        throw new Error('Invalid phone number format');
      }
    }

    return this.supplierRepo.update(request);
  }
}
