import { IServiceRepository } from '../repositories/service-repository.interface.js';
import { Service } from '../domain/entities.js';

export class CreateService {
  constructor(private serviceRepo: IServiceRepository) {}

  async execute(service: Omit<Service, 'id'>) {
    if (!service.name) throw new Error('Service name is required');
    if (!service.description) throw new Error('Service description is required');
    if (service.price < 0) throw new Error('Service price cannot be negative');
    if (service.duration_minutes < 0) throw new Error('Service duration cannot be negative');
    
    return this.serviceRepo.create(service);
  }
}
