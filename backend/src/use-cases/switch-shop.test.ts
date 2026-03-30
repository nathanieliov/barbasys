import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SwitchShop } from './switch-shop.js';
import { UserRepository } from '../repositories/user-repository.interface.js';

describe('SwitchShop Use Case', () => {
  let userRepository: UserRepository;
  let switchShop: SwitchShop;

  beforeEach(() => {
    userRepository = {
      findById: vi.fn(),
      updateShopId: vi.fn(),
    } as any;
    switchShop = new SwitchShop(userRepository);
  });

  it('should successfully switch shop and return new token', async () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      role: 'OWNER',
      barber_id: null,
      shop_id: 1
    };

    (userRepository.findById as any).mockResolvedValue(mockUser);
    (userRepository.updateShopId as any).mockResolvedValue(undefined);

    // Mock environment for JWT
    process.env.JWT_SECRET = 'test-secret';

    const result = await switchShop.execute({ userId: 1, shopId: 2 });

    expect(userRepository.updateShopId).toHaveBeenCalledWith(1, 2);
    expect(result.user.shop_id).toBe(2);
    expect(result.token).toBeDefined();
  });

  it('should throw error if user not found', async () => {
    (userRepository.findById as any).mockResolvedValue(null);

    await expect(switchShop.execute({ userId: 1, shopId: 2 }))
      .rejects.toThrow('User not found');
  });
});
