import { UserRepository } from '../repositories/user-repository.interface.js';
import { ICustomerRepository } from '../repositories/customer-repository.interface.js';
import bcrypt from 'bcryptjs';
import { sendOTP } from '../communication.js';
import i18n from '../i18n.js';

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

    // In dev/test mode (no real email configured), skip rate limiting so
    // developers can resend freely without waiting 15 minutes.
    const isDevMode = process.env.NODE_ENV !== 'production' && process.env.EMAIL_USER == null;

    const now = new Date();
    let otpRequestsCount = 0;

    if (!isDevMode) {
      const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
      otpRequestsCount = user.otp_requests_count || 0;
      const lastRequestAt = user.last_otp_request_at ? new Date(user.last_otp_request_at) : null;

      if (lastRequestAt && lastRequestAt < fifteenMinutesAgo) {
        otpRequestsCount = 0;
      }

      if (otpRequestsCount >= 3) {
        throw new Error(i18n.t('errors.too_many_otp_requests'));
      }
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

    const result = await sendOTP(email, otp);

    return {
      success: true,
      message: 'OTP sent successfully',
      ...(result.simulated && process.env.NODE_ENV !== 'production' ? { devCode: otp } : {})
    };
  }
}
