import { Customer } from '../domain/entities.js';

export interface ICustomerRepository {
  findByEmailOrPhone(email: string | null, phone: string | null): Promise<Customer | null>;
  create(customer: Partial<Customer>): Promise<number>;
  update(customer: Partial<Customer> & { id: number }): Promise<void>;
  updateLastVisit(id: number): Promise<void>;
}
