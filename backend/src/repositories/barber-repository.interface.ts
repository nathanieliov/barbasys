import { Barber } from '../domain/entities.js';

export interface IBarberRepository {
  findAll(): Promise<Barber[]>;
  findById(id: number): Promise<Barber | null>;
  create(barber: Omit<Barber, 'id'>): Promise<number>;
  delete(id: number): Promise<void>;
}
