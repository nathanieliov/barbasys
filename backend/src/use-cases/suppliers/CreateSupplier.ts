import { ISupplierRepository } from '../../repositories/supplier-repository.interface.js';
import { Supplier } from '../../domain/entities.js';

export interface CreateSupplierRequest {
  name: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  lead_time_days?: number;
}

export class CreateSupplier {
  constructor(private supplierRepo: ISupplierRepository) {}

  async execute(request: CreateSupplierRequest): Promise<number> {
    if (!request.name) throw new Error('Supplier name is required');
    
    if (request.phone) {
      // Basic phone validation: at least 7 digits, can have +, -, (), spaces
      const phoneRegex = /^[\d\s\+\-\(\)]{7,}$/;
      if (!phoneRegex.test(request.phone)) {
        throw new Error('Invalid phone number format');
      }
    }

    return this.supplierRepo.create({
      name: request.name,
      contact_name: request.contact_name || null,
      email: request.email || null,
      phone: request.phone || null,
      lead_time_days: request.lead_time_days ?? 7
    });
  }
}
