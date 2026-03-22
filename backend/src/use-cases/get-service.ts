import { IServiceRepository } from '../repositories/service-repository.interface.js';

export class GetService {
  constructor(private serviceRepo: IServiceRepository) {}

  async execute(id: number) {
    const service = await this.serviceRepo.findById(id);
    if (!service) throw new Error('Service not found');
    return service;
  }
}
