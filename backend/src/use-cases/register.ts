import bcrypt from 'bcryptjs';
import { UserRepository } from '../repositories/user-repository.interface.js';
import { UserRole } from '../domain/entities.js';

export class RegisterUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(data: { username: string; email: string; password_hash: string; role: UserRole; barber_id?: number | null }) {
    const existingUsername = await this.userRepository.findByUsername(data.username);
    if (existingUsername) {
      throw new Error('Username already exists');
    }

    const existingEmail = await this.userRepository.findByEmail(data.email);
    if (existingEmail) {
      throw new Error('Email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(data.password_hash, salt);

    const user = await this.userRepository.create({
      ...data,
      password_hash,
      barber_id: data.barber_id || null
    });

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      barber_id: user.barber_id
    };
  }
}
