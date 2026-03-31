import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { UserRepository } from '../repositories/user-repository.interface.js';

export class LoginUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(username: string, password_hash: string) {
    const user = await this.userRepository.findByUsername(username);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password_hash, user.password_hash);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    const options: SignOptions = {
      expiresIn: (process.env.JWT_EXPIRES_IN || '1d') as any
    };

    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role, 
        barber_id: user.barber_id, 
        shop_id: user.shop_id,
        fullname: user.fullname
      },
      process.env.JWT_SECRET || 'secret',
      options
    );

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        barber_id: user.barber_id,
        shop_id: user.shop_id,
        fullname: user.fullname
      }
    };
  }
}
