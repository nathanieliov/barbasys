import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateProfile } from './UpdateProfile.js';
import bcrypt from 'bcryptjs';

describe('UpdateProfile Use Case', () => {
  let mockUserRepo: any;
  let mockBarberRepo: any;
  let useCase: UpdateProfile;

  beforeEach(() => {
    mockUserRepo = {
      findById: vi.fn(),
      update: vi.fn()
    };
    mockBarberRepo = {
      update: vi.fn()
    };
    useCase = new UpdateProfile(mockUserRepo, mockBarberRepo);
  });

  it('should update username and email', async () => {
    const mockUser = { id: 1, username: 'old', email: 'old@ex.com', password_hash: 'hash' };
    mockUserRepo.findById.mockResolvedValue(mockUser);
    mockUserRepo.update.mockResolvedValue({ ...mockUser, username: 'new', email: 'new@ex.com' });

    const result = await useCase.execute({ id: 1, username: 'new', email: 'new@ex.com' });

    expect(result.username).toBe('new');
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
    mockUserRepo.update.mockResolvedValue(mockUser);

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

  it('should sync barber name if fullname changed', async () => {
    const mockUser = { id: 1, username: 'old', barber_id: 10, password_hash: 'h' };
    mockUserRepo.findById.mockResolvedValue(mockUser);
    mockUserRepo.update.mockResolvedValue({ ...mockUser, username: 'old', fullname: 'new name' });

    await useCase.execute({ id: 1, fullname: 'new name' });

    expect(mockBarberRepo.update).toHaveBeenCalledWith({
      id: 10,
      fullname: 'new name'
    });
  });
});
