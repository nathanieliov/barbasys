import { UserRepository } from '../repositories/user-repository.interface.js';
import { ICustomerRepository } from '../repositories/customer-repository.interface.js';
import jwt, { SignOptions } from 'jsonwebtoken';

export class VerifyOTP {
  constructor(
    private userRepo: UserRepository,
    private customerRepo: ICustomerRepository
  ) {}

  async execute(email: string, code: string) {
    const user = await this.userRepo.findByEmail(email);
    
    if (!user || !user.otp_code || user.otp_code !== code) {
      throw new Error('Invalid OTP');
    }

    const now = new Date();
    if (user.otp_expires && new Date(user.otp_expires) < now) {
      throw new Error('OTP expired');
    }

    // Check if customer profile is incomplete
    let requires_profile_completion = false;
    if (user.customer_id) {
      // Direct DB query here for simplicity or use customerRepo if findById is added
      const customer = await this.customerRepo.findByEmailOrPhone(email, null);
      if (customer && (!customer.name || !customer.birthday)) {
        requires_profile_completion = true;
      }
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
      },
      requires_profile_completion
    };
  }
}
