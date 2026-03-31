import { describe, it, expect, vi } from 'vitest';
import { LoginUseCase } from './login.js';
import { RegisterUseCase } from './register.js';
import { UserRepository } from '../repositories/user-repository.interface.js';
import { UserRole } from '../domain/entities.js';
import bcrypt from 'bcryptjs';

describe('Auth Use Cases', () => {
  const mockUserRepo = {
    findByUsername: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  } as unknown as UserRepository;

  const loginUseCase = new LoginUseCase(mockUserRepo);
  const registerUseCase = new RegisterUseCase(mockUserRepo);

  describe('RegisterUseCase', () => {
    it('should register a new user', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'password123', // This is plain password in this use case's input naming
        role: 'BARBER' as UserRole
      };

      vi.mocked(mockUserRepo.findByUsername).mockResolvedValue(null);
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(null);
      vi.mocked(mockUserRepo.create).mockResolvedValue({ id: 1, ...userData, password_hash: 'hashed' });

      const result = await registerUseCase.execute(userData);
      expect(result.username).toBe('testuser');
      expect(mockUserRepo.create).toHaveBeenCalled();
    });

    it('should throw if username exists', async () => {
      vi.mocked(mockUserRepo.findByUsername).mockResolvedValue({ id: 1 } as any);
      await expect(registerUseCase.execute({ username: 'exists' } as any)).rejects.toThrow('Username already exists');
    });

    it('should throw if email exists', async () => {
      vi.mocked(mockUserRepo.findByUsername).mockResolvedValue(null);
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue({ id: 1 } as any);
      await expect(registerUseCase.execute({ username: 'new', email: 'exists@example.com' } as any)).rejects.toThrow('Email already exists');
    });
  });

  describe('LoginUseCase', () => {
    it('should login successfully', async () => {
      const password = 'password123';
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);
      
      const mockUser = { id: 1, username: 'user1', password_hash: hash, role: 'OWNER' as UserRole, shop_id: 1 };
      vi.mocked(mockUserRepo.findByUsername).mockResolvedValue(mockUser);

      const result = await loginUseCase.execute('user1', password);
      expect(result.token).toBeDefined();
      expect(result.user.username).toBe('user1');
    });

    it('should throw for invalid username', async () => {
      vi.mocked(mockUserRepo.findByUsername).mockResolvedValue(null);
      await expect(loginUseCase.execute('wrong', 'pass')).rejects.toThrow('Invalid credentials');
    });

    it('should throw for invalid password', async () => {
      const mockUser = { id: 1, username: 'user1', password_hash: 'wronghash', role: 'OWNER' as UserRole };
      vi.mocked(mockUserRepo.findByUsername).mockResolvedValue(mockUser);
      await expect(loginUseCase.execute('user1', 'wrongpass')).rejects.toThrow('Invalid credentials');
    });
  });
});
