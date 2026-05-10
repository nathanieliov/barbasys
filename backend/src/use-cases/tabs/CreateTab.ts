import type { OutstandingTab, CreateTabDto } from '@barbasys/shared';
import type { ITabRepository } from '../../repositories/tab-repository.interface.js';

const MAX_OPEN_TABS_PER_CUSTOMER = 2;

export class CreateTab {
  constructor(private tabRepo: ITabRepository) {}

  execute(data: CreateTabDto): OutstandingTab {
    const openCount = this.tabRepo.countOpenByCustomer(data.customerId);
    if (openCount >= MAX_OPEN_TABS_PER_CUSTOMER) {
      throw new Error(`Customer already has ${openCount} open tab(s). Maximum is ${MAX_OPEN_TABS_PER_CUSTOMER}.`);
    }
    return this.tabRepo.create(data);
  }
}
