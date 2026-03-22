import { IServiceRepository } from '../repositories/service-repository.interface.js';

export class ListServices {
  constructor(private serviceRepo: IServiceRepository) {}

  async execute() {
    return this.serviceRepo.findAll();
  }
}
