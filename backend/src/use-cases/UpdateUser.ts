import bcrypt from 'bcryptjs';
import { UserRepository } from '../repositories/user-repository.interface.js';
import { User } from '../domain/entities.js';

export class UpdateUser {
  constructor(private userRepo: UserRepository) {}

  async execute(data: Partial<User> & { id: number; password?: string }): Promise<User> {
    const { password, ...rest } = data as any;
    const update: Partial<User> & { id: number } = rest;

    if (password) {
      update.password_hash = await bcrypt.hash(password, 10);
    }

    return this.userRepo.update(update);
  }
}
