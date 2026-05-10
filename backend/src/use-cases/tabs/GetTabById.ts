import type { OutstandingTab } from '@barbasys/shared';
import type { ITabRepository } from '../../repositories/tab-repository.interface.js';

export class GetTabById {
  constructor(private tabRepo: ITabRepository) {}

  execute(id: string): OutstandingTab {
    const tab = this.tabRepo.findById(id);
    if (!tab) throw new Error(`Tab ${id} not found`);
    return tab;
  }
}
