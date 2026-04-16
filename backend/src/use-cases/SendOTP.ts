import { UserRepository } from '../repositories/user-repository.interface.js';
import { ICustomerRepository } from '../repositories/customer-repository.interface.js';
import bcrypt from 'bcryptjs';

export class SendOTP {
  constructor(
    private userRepo: UserRepository,
    private customerRepo: ICustomerRepository
  ) {}

  async execute(email: string) {
    let user = await this.userRepo.findByEmail(email);

    if (!user) {      // Find or create customer record
      let customer = await this.customerRepo.findByEmailOrPhone(email, null);
      let customerId: number;
      
      if (customer) {
        customerId = customer.id;
      } else {
        customerId = await this.customerRepo.create({
          email,
          last_visit: new Date().toISOString()
        });
      }

      // Create CUSTOMER user for new emails
      const dummyPassword = await bcrypt.hash(Math.random().toString(36), 10);
      
      user = await this.userRepo.create({
        username: email,
        email,
        password_hash: dummyPassword,
        role: 'CUSTOMER',
        barber_id: null,
        customer_id: customerId,
        shop_id: null,
        fullname: email.split('@')[0],
        otp_code: null,
        otp_expires: null
      });
    }

    // Check rate limit (max 3 times in 15 minutes)
    const now = new Date();
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
    
    let otpRequestsCount = user.otp_requests_count || 0;
    let lastRequestAt = user.last_otp_request_at ? new Date(user.last_otp_request_at) : null;

    if (lastRequestAt && lastRequestAt < fifteenMinutesAgo) {
      // Reset count if last request was more than 15 minutes ago
      otpRequestsCount = 0;
    }

    if (otpRequestsCount >= 3) {
      throw new Error('Too many OTP requests. Please try again in 15 minutes.');
    }

    // Generate 6-digit OTP for any user (Customer, Barber, or Admin)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 10);

    await this.userRepo.update({
      id: user.id,
      otp_code: otp,
      otp_expires: expires.toISOString(),
      otp_requests_count: otpRequestsCount + 1,
      last_otp_request_at: now.toISOString()
    });

    console.log('--------------------------------------------------');
    console.log(`🔑 [OTP SIMULATION]`);
    console.log(`📧 Email: ${email}`);
    console.log(`🔢 Code:  ${otp}`);
    console.log('--------------------------------------------------');
    
    return { success: true, message: 'OTP sent successfully' };
  }
}
