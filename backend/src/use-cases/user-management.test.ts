import { describe, it, expect, vi } from 'vitest';
import { ListUsers } from './ListUsers.js';
import { UpdateUser } from './UpdateUser.js';
import { DeleteUser } from './DeleteUser.js';
import { UserRepository } from '../repositories/user-repository.interface.js';
import { User } from '../domain/entities.js';

describe('User Management Use Cases', () => {
  const mockUserRepo = {
    findAll: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  } as unknown as UserRepository;

  const listUsers = new ListUsers(mockUserRepo);
  const updateUser = new UpdateUser(mockUserRepo);
  const deleteUser = new DeleteUser(mockUserRepo);

  it('should list all users for a shop', async () => {
    const mockUsers: User[] = [
      { id: 1, username: 'user1', email: 'u1@ex.com', role: 'OWNER', barber_id: null, shop_id: 1, created_at: '', password_hash: 'hash' }
    ];
    vi.mocked(mockUserRepo.findAll).mockResolvedValue(mockUsers);

    const result = await listUsers.execute(1);
    expect(result).toEqual(mockUsers);
    expect(mockUserRepo.findAll).toHaveBeenCalledWith(1);
  });

  it('should update a user', async () => {
    vi.mocked(mockUserRepo.update).mockResolvedValue({ id: 1 } as any);
    await updateUser.execute({ id: 1, username: 'updated' });
    expect(mockUserRepo.update).toHaveBeenCalledWith({ id: 1, username: 'updated' });
  });

  it('should delete a user', async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue({ 
      id: 1, 
      username: 'user1', 
      email: 'u1@ex.com', 
      role: 'OWNER', 
      barber_id: null, 
      shop_id: 1, 
      created_at: '', 
      password_hash: 'hash' 
    });
    vi.mocked(mockUserRepo.delete).mockResolvedValue();
    await deleteUser.execute(1);
    expect(mockUserRepo.delete).toHaveBeenCalledWith(1);
  });

  it('should throw if user not found when deleting', async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(null);
    await expect(deleteUser.execute(999)).rejects.toThrow('User not found');
  });
});
