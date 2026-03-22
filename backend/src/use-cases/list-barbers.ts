import { IBarberRepository } from '../repositories/barber-repository.interface.js';

export class ListBarbers {
  constructor(private barberRepo: IBarberRepository) {}

  async execute() {
    return this.barberRepo.findAll();
  }
}
