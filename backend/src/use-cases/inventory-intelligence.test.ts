import { describe, it, expect, vi, beforeEach, Mocked } from 'vitest';
import { GetInventoryIntelligence } from './inventory/get-inventory-intelligence.js';
import { IProductRepository, ProductIntelligence } from '../repositories/product-repository.interface.js';

describe('GetInventoryIntelligence', () => {
  let getInventoryIntelligence: GetInventoryIntelligence;
  let mockProductRepo: Mocked<IProductRepository>;

  beforeEach(() => {
    mockProductRepo = {
      findAll: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      restock: vi.fn(),
      getIntelligence: vi.fn(),
    } as any;

    getInventoryIntelligence = new GetInventoryIntelligence(mockProductRepo);
  });

  it('should calculate days remaining and reorder suggestion correctly', async () => {
    const shopId = 1;
    const mockIntelligence: ProductIntelligence[] = [
      {
        id: 1,
        name: 'Pomade',
        stock: 10,
        min_stock_threshold: 3,
        avg_daily_velocity: 1.0, // 10 days remaining
      },
      {
        id: 2,
        name: 'Shampoo',
        stock: 5,
        min_stock_threshold: 2,
        avg_daily_velocity: 1.0, // 5 days remaining -> reorder!
      },
      {
        id: 3,
        name: 'Oil',
        stock: 20,
        min_stock_threshold: 5,
        avg_daily_velocity: 0, // 999 days remaining
      }
    ];

    mockProductRepo.getIntelligence.mockResolvedValue(mockIntelligence);

    const result = await getInventoryIntelligence.execute(shopId);

    expect(result).toHaveLength(3);

    // Pomade: 10/1.0 = 10 days, reorder = false (10 > 7)
    expect(result[0].days_remaining).toBe(10);
    expect(result[0].reorder_suggestion).toBe(false);

    // Shampoo: 5/1.0 = 5 days, reorder = true (5 <= 7)
    expect(result[1].days_remaining).toBe(5);
    expect(result[1].reorder_suggestion).toBe(true);

    // Oil: 0 velocity = 999 days, reorder = false (999 > 7)
    expect(result[2].days_remaining).toBe(999);
    expect(result[2].reorder_suggestion).toBe(false);
  });

  it('should handle boundary case for reorder suggestion (exactly 7 days)', async () => {
    const shopId = 1;
    const mockIntelligence: ProductIntelligence[] = [
      {
        id: 4,
        name: 'Conditioner',
        stock: 7,
        min_stock_threshold: 2,
        avg_daily_velocity: 1.0, // 7 days remaining -> reorder!
      },
      {
        id: 5,
        name: 'Gel',
        stock: 8,
        min_stock_threshold: 2,
        avg_daily_velocity: 1.0, // 8 days remaining -> no reorder
      }
    ];

    mockProductRepo.getIntelligence.mockResolvedValue(mockIntelligence);

    const result = await getInventoryIntelligence.execute(shopId);

    expect(result[0].days_remaining).toBe(7);
    expect(result[0].reorder_suggestion).toBe(true);

    expect(result[1].days_remaining).toBe(8);
    expect(result[1].reorder_suggestion).toBe(false);
  });
});
