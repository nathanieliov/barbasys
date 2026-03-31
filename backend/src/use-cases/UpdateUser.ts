import { UserRepository } from '../repositories/user-repository.interface.js';
import { User } from '../domain/entities.js';

export class UpdateUser {
  constructor(private userRepo: UserRepository) {}

  async execute(user: Partial<User> & { id: number }): Promise<void> {
    return this.userRepo.update(user);
  }
}
