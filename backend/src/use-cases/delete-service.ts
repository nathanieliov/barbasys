import { IServiceRepository } from '../repositories/service-repository.interface.js';

export class DeleteService {
  constructor(private serviceRepo: IServiceRepository) {}

  async execute(id: number) {
    const existingService = await this.serviceRepo.findById(id);
    if (!existingService) throw new Error('Service not found');
    
    return this.serviceRepo.delete(id);
  }
}
