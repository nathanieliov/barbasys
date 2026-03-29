import { IProductRepository } from '../../repositories/product-repository.interface.js';

export interface InventoryIntelligenceResult {
  id: number;
  name: string;
  stock: number;
  min_stock_threshold: number;
  avg_daily_velocity: number;
  days_remaining: number;
  reorder_suggestion: boolean;
}

export class GetInventoryIntelligence {
  constructor(private productRepository: IProductRepository) {}

  async execute(shopId: number): Promise<InventoryIntelligenceResult[]> {
    const intelligence = await this.productRepository.getIntelligence(shopId);

    return intelligence.map(item => {
      const daysRemaining = item.avg_daily_velocity > 0
        ? Math.floor(item.stock / item.avg_daily_velocity)
        : 999;
      return {
        ...item,
        avg_daily_velocity: item.avg_daily_velocity,
        days_remaining: daysRemaining,
        reorder_suggestion: daysRemaining <= 7
      };
    });
  }
}
