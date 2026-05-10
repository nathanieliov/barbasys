import type { OutstandingTab, TabStatus } from '@barbasys/shared';
import type { ITabRepository } from '../../repositories/tab-repository.interface.js';

export class GetTabs {
  constructor(private tabRepo: ITabRepository) {}

  execute(shopId: number, status: TabStatus | 'all' = 'all'): OutstandingTab[] {
    return this.tabRepo.findByShop(shopId, status);
  }
}
