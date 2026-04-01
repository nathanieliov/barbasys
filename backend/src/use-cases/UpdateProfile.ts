import bcrypt from 'bcryptjs';
import { UserRepository } from '../repositories/user-repository.interface.js';
import { IBarberRepository } from '../repositories/barber-repository.interface.js';
import { User } from '../domain/entities.js';

export interface UpdateProfileRequest {
  id: number;
  username?: string;
  fullname?: string;
  email?: string;
  current_password?: string;
  new_password?: string;
}

export class UpdateProfile {
  constructor(
    private userRepo: UserRepository,
    private barberRepo?: IBarberRepository
  ) {}

  async execute(request: UpdateProfileRequest): Promise<User> {
    const user = await this.userRepo.findById(request.id);
    if (!user) throw new Error('User not found');

    const updateData: Partial<User> & { id: number } = { id: request.id };

    if (request.username) updateData.username = request.username;
    if (request.email) updateData.email = request.email;
    if (request.fullname) updateData.fullname = request.fullname;

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

    // Sync barber fullname if linked - MUST HAPPEN BEFORE userRepo.update
    // because userRepo.update returns the user with a joined fullname from the barber table.
    if (request.fullname && user.barber_id && this.barberRepo) {
      await this.barberRepo.update({
        id: user.barber_id,
        fullname: request.fullname
      });
    }

    const updatedUser = await this.userRepo.update(updateData);

    return updatedUser;
  }
}
