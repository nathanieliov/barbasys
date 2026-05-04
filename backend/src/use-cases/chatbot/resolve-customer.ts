import type { Customer } from '../../domain/entities.js';
import type { ICustomerRepository } from '../../repositories/customer-repository.interface.js';

export async function resolveCustomer(repo: ICustomerRepository, phone: string): Promise<Customer> {
  const existing = await repo.findByEmailOrPhone(null, phone);
  if (existing) return existing;

  const customerId = await repo.create({
    name: null,
    email: null,
    phone,
    birthday: null,
    notes: null,
  });

  const created = await repo.findById(customerId);
  if (!created) throw new Error('Failed to retrieve created customer');
  return created;
}
