import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateProfile } from './UpdateProfile.js';
import { UserRepository } from '../repositories/user-repository.interface.js';
import bcrypt from 'bcryptjs';

describe('UpdateProfile Use Case', () => {
  let mockUserRepo: any;
  let useCase: UpdateProfile;

  beforeEach(() => {
    mockUserRepo = {
      findById: vi.fn(),
      update: vi.fn()
    };
    useCase = new UpdateProfile(mockUserRepo);
  });

  it('should update username and email', async () => {
    const mockUser = { id: 1, username: 'old', email: 'old@ex.com', password_hash: 'hash' };
    mockUserRepo.findById.mockResolvedValue(mockUser);
    mockUserRepo.update.mockResolvedValue();

    await useCase.execute({ id: 1, username: 'new', email: 'new@ex.com' });

    expect(mockUserRepo.update).toHaveBeenCalledWith({
      id: 1,
      username: 'new',
      email: 'new@ex.com'
    });
  });

  it('should update password with valid current password', async () => {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('current123', salt);
    const mockUser = { id: 1, username: 'user', password_hash: hash };
    
    mockUserRepo.findById.mockResolvedValue(mockUser);
    mockUserRepo.update.mockResolvedValue();

    await useCase.execute({ 
      id: 1, 
      current_password: 'current123', 
      new_password: 'new123' 
    });

    expect(mockUserRepo.update).toHaveBeenCalled();
    const callArgs = mockUserRepo.update.mock.calls[0][0];
    expect(callArgs.password_hash).toBeDefined();
    expect(await bcrypt.compare('new123', callArgs.password_hash)).toBe(true);
  });

  it('should throw if current password is incorrect', async () => {
    const hash = await bcrypt.hash('correct', 10);
    mockUserRepo.findById.mockResolvedValue({ id: 1, password_hash: hash });

    await expect(useCase.execute({ 
      id: 1, 
      current_password: 'wrong', 
      new_password: 'new' 
    })).rejects.toThrow('Current password is incorrect');
  });

  it('should throw if current password missing when setting new one', async () => {
    mockUserRepo.findById.mockResolvedValue({ id: 1 });

    await expect(useCase.execute({ 
      id: 1, 
      new_password: 'new' 
    })).rejects.toThrow('Current password is required');
  });
});
