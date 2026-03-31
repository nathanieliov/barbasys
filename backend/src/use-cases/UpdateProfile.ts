import bcrypt from 'bcryptjs';
import { UserRepository } from '../repositories/user-repository.interface.js';
import { User } from '../domain/entities.js';

export interface UpdateProfileRequest {
  id: number;
  username?: string;
  email?: string;
  current_password?: string;
  new_password?: string;
}

export class UpdateProfile {
  constructor(private userRepo: UserRepository) {}

  async execute(request: UpdateProfileRequest): Promise<void> {
    const user = await this.userRepo.findById(request.id);
    if (!user) throw new Error('User not found');

    const updateData: Partial<User> & { id: number } = { id: request.id };

    if (request.username) updateData.username = request.username;
    if (request.email) updateData.email = request.email;

    if (request.new_password) {
      if (!request.current_password) {
        throw new Error('Current password is required to set a new password');
      }

      const isMatch = await bcrypt.compare(request.current_password, user.password_hash);
      if (!isMatch) {
        throw new Error('Current password is incorrect');
      }

      const salt = await bcrypt.genSalt(10);
      updateData.password_hash = await bcrypt.hash(request.new_password, salt);
    }

    return this.userRepo.update(updateData);
  }
}
