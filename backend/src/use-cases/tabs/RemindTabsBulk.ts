import type { ITabRepository } from '../../repositories/tab-repository.interface.js';
import type { IWhatsAppClient } from '../../adapters/whatsapp/whatsapp-client.interface.js';
import { RemindTab } from './RemindTab.js';

export class RemindTabsBulk {
  private remindOne: RemindTab;

  constructor(tabRepo: ITabRepository, wa: IWhatsAppClient) {
    this.remindOne = new RemindTab(tabRepo, wa);
  }

  async execute(
    tabIds: string[],
    sentBy: number | null,
  ): Promise<Array<{ id: string; ok: boolean; error?: string }>> {
    const results: Array<{ id: string; ok: boolean; error?: string }> = [];

    for (const id of tabIds) {
      try {
        await this.remindOne.execute(id, sentBy);
        results.push({ id, ok: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        results.push({ id, ok: false, error: msg });
      }
    }

    return results;
  }
}
