import { describe, it, expect, vi } from 'vitest';
import { GetInventoryIntelligence } from './get-inventory-intelligence.js';
import { IProductRepository } from '../../repositories/product-repository.interface.js';

describe('GetInventoryIntelligence Use Case', () => {
  const mockProductRepo = {
    getIntelligence: vi.fn()
  } as unknown as IProductRepository;

  const useCase = new GetInventoryIntelligence(mockProductRepo);

  it('should calculate reorder suggestions correctly', async () => {
    const mockData = [
      { id: 1, name: 'Pomade', stock: 10, min_stock_threshold: 5, avg_daily_velocity: 2 }, // 5 days left -> reorder
      { id: 2, name: 'Shampoo', stock: 20, min_stock_threshold: 2, avg_daily_velocity: 1 }, // 20 days left -> no reorder
      { id: 3, name: 'Towel', stock: 5, min_stock_threshold: 2, avg_daily_velocity: 0 } // Inf days left -> no reorder
    ];

    vi.mocked(mockProductRepo.getIntelligence).mockResolvedValue(mockData);

    const result = await useCase.execute(1);

    expect(result[0].days_remaining).toBe(5);
    expect(result[0].reorder_suggestion).toBe(true);

    expect(result[1].days_remaining).toBe(20);
    expect(result[1].reorder_suggestion).toBe(false);

    expect(result[2].days_remaining).toBe(999);
    expect(result[2].reorder_suggestion).toBe(false);
  });
});
