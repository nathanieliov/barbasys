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
    
    if (user && user.role !== 'CUSTOMER') {
      throw new Error('This email is registered for the professional team. Please use the Professional Sign In.');
    }

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

      // Create CUSTOMER user
      // Passwordless users still need a password hash for the system, we use a random one
      const dummyPassword = await bcrypt.hash(Math.random().toString(36), 10);
      
      user = await this.userRepo.create({
        username: email,
        email,
        password_hash: dummyPassword,
        role: 'CUSTOMER',
        barber_id: null,
        customer_id: customerId,
        shop_id: null, // Scoped to shops via Discovery
        fullname: email.split('@')[0]
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 10); // 10 minutes expiry

    await this.userRepo.update({
      id: user.id,
      otp_code: otp,
      otp_expires: expires.toISOString()
    });

    // SIMULATION: Log the OTP
    console.log(`[OTP SIMULATION] Code for ${email}: ${otp}`);
    
    return { success: true, message: 'OTP sent successfully' };
  }
}
