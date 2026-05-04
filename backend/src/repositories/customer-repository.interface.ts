import { Customer } from '../domain/entities.js';

export interface ICustomerRepository {
  findById(id: number, shopId?: number): Promise<Customer | null>;
  findByEmailOrPhone(email: string | null, phone: string | null, shopId?: number): Promise<Customer | null>;
  findAll(shopId: number): Promise<Customer[]>;
  create(customer: Partial<Customer>): Promise<number>;
  update(customer: Partial<Customer> & { id: number }): Promise<void>;
  updateLastVisit(id: number): Promise<void>;
  setWaOptIn(customerId: number, optedIn: boolean): Promise<void>;
  setPreferredLanguage(customerId: number, language: 'es' | 'en'): Promise<void>;
}
