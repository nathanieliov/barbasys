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
    
    if (!user) {
      // Find or create customer record
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

    // Generate 6-digit OTP for any user (Customer, Barber, or Admin)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 10);

    await this.userRepo.update({
      id: user.id,
      otp_code: otp,
      otp_expires: expires.toISOString()
    });

    console.log(`[OTP SIMULATION] Code for ${email}: ${otp}`);
    
    return { success: true, message: 'OTP sent successfully' };
  }
}
