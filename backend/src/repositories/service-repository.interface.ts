import { Service } from '../domain/entities.js';

export interface IServiceRepository {
  findAll(): Promise<Service[]>;
  findById(id: number): Promise<Service | null>;
  create(service: Omit<Service, 'id'>): Promise<number>;
  update(service: Service): Promise<void>;
  delete(id: number): Promise<void>;
}
