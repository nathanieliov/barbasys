import { IServiceRepository } from '../repositories/service-repository.interface.js';
import { Service } from '../domain/entities.js';

export class UpdateService {
  constructor(private serviceRepo: IServiceRepository) {}

  async execute(service: Service) {
    if (!service.id) throw new Error('Service ID is required');
    if (!service.name) throw new Error('Service name is required');
    if (service.price < 0) throw new Error('Service price cannot be negative');
    if (service.duration_minutes < 0) throw new Error('Service duration cannot be negative');

    const existingService = await this.serviceRepo.findById(service.id);
    if (!existingService) throw new Error('Service not found');

    return this.serviceRepo.update(service);
  }
}
