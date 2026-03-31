import { describe, it, expect, vi } from 'vitest';
import { SwitchShop } from './switch-shop.js';
import { UserRepository } from '../repositories/user-repository.interface.js';

describe('SwitchShop Use Case', () => {
  const mockUserRepo = {
    findById: vi.fn(),
    updateShopId: vi.fn()
  } as unknown as UserRepository;

  const useCase = new SwitchShop(mockUserRepo);

  it('should switch shop and return new token', async () => {
    const mockUser = { id: 1, username: 'test', role: 'OWNER', barber_id: null, shop_id: 1 };
    vi.mocked(mockUserRepo.findById).mockResolvedValue(mockUser as any);
    vi.mocked(mockUserRepo.updateShopId).mockResolvedValue();

    const result = await useCase.execute({ userId: 1, shopId: 2 });

    expect(result.token).toBeDefined();
    expect(result.user.shop_id).toBe(2);
    expect(mockUserRepo.updateShopId).toHaveBeenCalledWith(1, 2);
  });

  it('should throw if user not found', async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(null);
    await expect(useCase.execute({ userId: 999, shopId: 2 })).rejects.toThrow('User not found');
  });
});
