import type { OutstandingTab, TabStatus, CreateTabDto } from '@barbasys/shared';

export interface ITabRepository {
  findById(id: string): OutstandingTab | null;
  findByShop(shopId: number, status?: TabStatus | 'all'): OutstandingTab[];
  findByCustomer(customerId: number): OutstandingTab[];
  findByBarber(barberId: number, shopId?: number): OutstandingTab[];
  countOpenByCustomer(customerId: number): number;
  create(data: CreateTabDto): OutstandingTab;
  updateStatus(id: string, status: TabStatus, extra?: {
    paid_at?: string;
    paid_method?: 'cash' | 'bank_transfer';
    paid_sale_id?: number;
    tip_on_payback?: number;
    last_reminder_at?: string;
    reminder_count?: number;
  }): void;
  logReminder(tabId: string, sentBy: number | null, waStatus: string): void;
}
