import { UserRepository } from '../repositories/user-repository.interface.js';
import { ICustomerRepository } from '../repositories/customer-repository.interface.js';
import jwt, { SignOptions } from 'jsonwebtoken';
import i18n from '../i18n.js';
import { JWT_SECRET } from '../auth/jwt-secret.js';

export class VerifyOTP {
  constructor(
    private userRepo: UserRepository,
    private customerRepo: ICustomerRepository
  ) {}

  async execute(email: string, code: string) {
    const user = await this.userRepo.findByEmail(email);
    
    if (!user || !user.otp_code || user.otp_code !== code) {
      throw new Error(i18n.t('errors.invalid_otp'));
    }

    const now = new Date();
    if (user.otp_expires && new Date(user.otp_expires) < now) {
      throw new Error(i18n.t('errors.otp_expired'));
    }

    // Ensure user has a linked customer record (allow Barbers to act as Customers)
    let customerId = user.customer_id;
    if (!customerId) {
      const existingCustomer = await this.customerRepo.findByEmailOrPhone(email, null);
      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        customerId = await this.customerRepo.create({
          email,
          last_visit: new Date().toISOString()
        });
      }
      await this.userRepo.update({ id: user.id, customer_id: customerId });
    }

    // Check if customer profile is incomplete
    let requires_profile_completion = false;
    const customer = await this.customerRepo.findById(customerId);
    
    if (customer) {
      // Sync name if missing but we have it on user
      if (!customer.name && user.fullname) {
        await this.customerRepo.update({ id: customer.id, name: user.fullname });
        customer.name = user.fullname;
      }

      // If it's a barber or owner/manager, and we have a name, we don't strict-require birthday for booking
      const isStaff = ['BARBER', 'OWNER', 'MANAGER'].includes(user.role);
      
      if (!customer.name) {
        requires_profile_completion = true;
      } else if (!isStaff && !customer.birthday) {
        // Regular customers must provide birthday (for marketing/CRM)
        requires_profile_completion = true;
      }
    }

    // Clear OTP and reset requests count
    await this.userRepo.update({
      id: user.id,
      otp_code: null,
      otp_expires: null,
      otp_requests_count: 0,
      last_otp_request_at: null
    });

    const options: SignOptions = {
      expiresIn: (process.env.JWT_EXPIRES_IN || '1d') as any
    };

    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role, 
        customer_id: customerId,
        shop_id: user.shop_id,
        fullname: user.fullname
      },
      JWT_SECRET,
      options
    );

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        customer_id: customerId,
        shop_id: user.shop_id,
        fullname: user.fullname
      },
      requires_profile_completion
    };
  }
}
