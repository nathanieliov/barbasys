import { Barber } from '../domain/entities.js';

export interface IBarberRepository {
  findAll(): Promise<Barber[]>;
  findById(id: number): Promise<Barber | null>;
  findBySlug(slug: string): Promise<Barber | null>;
  create(barber: Omit<Barber, 'id'>): Promise<number>;
  update(barber: Partial<Barber> & { id: number }): Promise<void>;
  delete(id: number): Promise<void>;
  getCommissions(startDate: string, endDate: string, shopId: number, barberId?: number): Promise<any[]>;
}
