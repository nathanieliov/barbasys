import type { OutstandingTab } from '@barbasys/shared';
import type { ITabRepository } from '../../repositories/tab-repository.interface.js';
import type { IWhatsAppClient } from '../../adapters/whatsapp/whatsapp-client.interface.js';

const RATE_LIMIT_MS = 24 * 60 * 60 * 1000;

function buildMessage(tab: OutstandingTab, barberName: string): string {
  const date = tab.opened_at.split('T')[0] ?? tab.opened_at.substring(0, 10);
  const name = tab.customer_name ?? 'there';
  return (
    `Hey ${name}! Just a friendly reminder about your last visit ✂️ — ` +
    `you have an open tab of $${tab.amount.toFixed(2)} from ${date}. ` +
    `Pop in any time! — ${barberName}`
  );
}

export class RemindTab {
  constructor(
    private tabRepo: ITabRepository,
    private wa: IWhatsAppClient,
  ) {}

  async execute(tabId: string, sentBy: number | null): Promise<{ status: string }> {
    const tab = this.tabRepo.findById(tabId);
    if (!tab) throw new Error(`Tab ${tabId} not found`);
    if (tab.status === 'paid') throw new Error('Tab is already paid');

    if (tab.last_reminder_at) {
      const elapsed = Date.now() - new Date(tab.last_reminder_at).getTime();
      if (elapsed < RATE_LIMIT_MS) {
        throw new Error('A reminder was already sent in the last 24 hours');
      }
    }

    const phone = tab.customer_phone;
    if (!phone) throw new Error('Customer has no phone number on record');

    const barberName = tab.barber_name ?? 'Your barber';
    const body = buildMessage(tab, barberName);

    const result = await this.wa.sendText(phone, body);

    const now = new Date().toISOString();
    this.tabRepo.updateStatus(tabId, 'reminded', {
      last_reminder_at: now,
      reminder_count: tab.reminder_count + 1,
    });
    this.tabRepo.logReminder(tabId, sentBy, result.status);

    return { status: result.status };
  }
}
