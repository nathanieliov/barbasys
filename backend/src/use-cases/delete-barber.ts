import { IBarberRepository } from '../repositories/barber-repository.interface.js';

export class DeleteBarber {
  constructor(private barberRepo: IBarberRepository) {}

  async execute(id: number) {
    const existingBarber = await this.barberRepo.findById(id);
    if (!existingBarber) throw new Error('Barber not found');
    
    // In a real scenario, we might want to check for future appointments here
    // For now, we'll proceed with deletion
    return this.barberRepo.delete(id);
  }
}
