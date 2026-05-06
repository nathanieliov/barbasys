import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SendOTP } from './SendOTP.js';
import { VerifyOTP } from './VerifyOTP.js';
import { UserRepository } from '../repositories/user-repository.interface.js';
import { ICustomerRepository } from '../repositories/customer-repository.interface.js';

describe('OTP Use Cases', () => {
  const mockUserRepo = {
    findByEmail: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findById: vi.fn()
  } as unknown as UserRepository;

  const mockCustomerRepo = {
    findByEmailOrPhone: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  } as unknown as ICustomerRepository;

  const sendOTP = new SendOTP(mockUserRepo, mockCustomerRepo);
  const verifyOTP = new VerifyOTP(mockUserRepo, mockCustomerRepo);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SendOTP', () => {
    it('should send OTP and increment count', async () => {
      const mockUser = { id: 1, email: 'test@example.com', role: 'CUSTOMER', otp_requests_count: 0 };
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(mockUser as any);

      await sendOTP.execute('test@example.com');

      expect(mockUserRepo.update).toHaveBeenCalledWith(expect.objectContaining({
        id: 1,
        otp_requests_count: 1
      }));
    });

    it('should allow a BARBER to get OTP for booking', async () => {
      const mockUser = { id: 1, email: 'barber@example.com', role: 'BARBER', otp_requests_count: 0 };
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(mockUser as any);

      await sendOTP.execute('barber@example.com');

      expect(mockUserRepo.update).toHaveBeenCalledWith(expect.objectContaining({
        id: 1,
        otp_requests_count: 1
      }));
    });

    it('should throw error if rate limit exceeded', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'CUSTOMER',
        otp_requests_count: 3,
        last_otp_request_at: new Date().toISOString()
      };
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(mockUser as any);

      // Simulate production mode so rate limiting is enforced
      const prev = process.env.EMAIL_USER;
      process.env.EMAIL_USER = 'test@example.com';
      try {
        await expect(sendOTP.execute('test@example.com')).rejects.toThrow(/Too many OTP requests|Demasiados intentos de OTP/);
      } finally {
        if (prev == null) delete process.env.EMAIL_USER;
        else process.env.EMAIL_USER = prev;
      }
    });

    it('should reset count after 15 minutes', async () => {
      const sixteenMinutesAgo = new Date(Date.now() - 16 * 60 * 1000).toISOString();
      const mockUser = { 
        id: 1, 
        email: 'test@example.com', 
        role: 'CUSTOMER', 
        otp_requests_count: 3,
        last_otp_request_at: sixteenMinutesAgo
      };
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(mockUser as any);

      await sendOTP.execute('test@example.com');

      expect(mockUserRepo.update).toHaveBeenCalledWith(expect.objectContaining({
        id: 1,
        otp_requests_count: 1
      }));
    });
  });

  describe('VerifyOTP', () => {
    it('should verify OTP and reset count', async () => {
      const expires = new Date(Date.now() + 10000).toISOString();
      const mockUser = { 
        id: 1, 
        email: 'test@example.com', 
        role: 'CUSTOMER', 
        otp_code: '123456', 
        otp_expires: expires,
        otp_requests_count: 2
      };
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(mockUser as any);
      vi.mocked(mockCustomerRepo.findById).mockResolvedValue({ id: 10, name: 'Test', birthday: '2000-01-01' } as any);

      await verifyOTP.execute('test@example.com', '123456');

      expect(mockUserRepo.update).toHaveBeenCalledWith(expect.objectContaining({
        id: 1,
        otp_code: null,
        otp_requests_count: 0
      }));
    });

    it('should verify OTP for BARBER and check for profile completion', async () => {
      const expires = new Date(Date.now() + 10000).toISOString();
      const mockUser = { 
        id: 1, 
        email: 'barber@example.com', 
        role: 'BARBER', 
        otp_code: '123456', 
        otp_expires: expires,
        customer_id: 10,
        fullname: 'Barber Name'
      };
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(mockUser as any);
      
      // Customer has no birthday, currently it requires_profile_completion = true
      vi.mocked(mockCustomerRepo.findById).mockResolvedValue({ 
        id: 10, 
        email: 'barber@example.com',
        name: 'Barber Name',
        birthday: null 
      } as any);

      const result = await verifyOTP.execute('barber@example.com', '123456');

      // We WANT this to be false if the user is a BARBER and we have their name
      expect(result.requires_profile_completion).toBe(false);
    });

    it('should verify OTP for BARBER and REQUIRE profile if name is missing', async () => {
      const expires = new Date(Date.now() + 10000).toISOString();
      const mockUser = { 
        id: 1, 
        email: 'barber-no-name@example.com', 
        role: 'BARBER', 
        otp_code: '123456', 
        otp_expires: expires,
        customer_id: 11,
        fullname: null // No name on user either
      };
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(mockUser as any);
      
      vi.mocked(mockCustomerRepo.findById).mockResolvedValue({ 
        id: 11, 
        email: 'barber-no-name@example.com',
        name: null,
        birthday: null 
      } as any);

      const result = await verifyOTP.execute('barber-no-name@example.com', '123456');

      expect(result.requires_profile_completion).toBe(true);
    });
  });
});

