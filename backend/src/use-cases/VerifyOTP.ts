import { UserRepository } from '../repositories/user-repository.interface.js';
import jwt, { SignOptions } from 'jsonwebtoken';

export class VerifyOTP {
  constructor(private userRepo: UserRepository) {}

  async execute(email: string, code: string) {
    const user = await this.userRepo.findByEmail(email);
    
    if (!user || !user.otp_code || user.otp_code !== code) {
      throw new Error('Invalid OTP');
    }

    const now = new Date();
    if (user.otp_expires && new Date(user.otp_expires) < now) {
      throw new Error('OTP expired');
    }

    // Clear OTP
    await this.userRepo.update({
      id: user.id,
      otp_code: null,
      otp_expires: null
    });

    const options: SignOptions = {
      expiresIn: (process.env.JWT_EXPIRES_IN || '1d') as any
    };

    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role, 
        customer_id: user.customer_id,
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
        customer_id: user.customer_id,
        shop_id: user.shop_id,
        fullname: user.fullname
      }
    };
  }
}
