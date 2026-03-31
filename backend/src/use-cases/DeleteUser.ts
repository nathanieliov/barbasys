import { UserRepository } from '../repositories/user-repository.interface.js';

export class DeleteUser {
  constructor(private userRepo: UserRepository) {}

  async execute(id: number): Promise<void> {
    const user = await this.userRepo.findById(id);
    if (!user) throw new Error('User not found');
    
    // Prevent deleting the last owner if needed, but for now just delete
    return this.userRepo.delete(id);
  }
}
