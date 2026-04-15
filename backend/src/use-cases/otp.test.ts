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
    create: vi.fn()
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

    it('should throw error if rate limit exceeded', async () => {
      const mockUser = { 
        id: 1, 
        email: 'test@example.com', 
        role: 'CUSTOMER', 
        otp_requests_count: 3,
        last_otp_request_at: new Date().toISOString()
      };
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(mockUser as any);

      await expect(sendOTP.execute('test@example.com')).rejects.toThrow('Too many OTP requests');
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

      await verifyOTP.execute('test@example.com', '123456');

      expect(mockUserRepo.update).toHaveBeenCalledWith(expect.objectContaining({
        id: 1,
        otp_code: null,
        otp_requests_count: 0
      }));
    });
  });
});
