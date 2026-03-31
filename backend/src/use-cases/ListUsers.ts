import { UserRepository } from '../repositories/user-repository.interface.js';
import { User } from '../domain/entities.js';

export class ListUsers {
  constructor(private userRepo: UserRepository) {}

  async execute(shopId: number): Promise<User[]> {
    return this.userRepo.findAll(shopId);
  }
}
