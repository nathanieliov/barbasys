import type { ITabRepository } from '../../repositories/tab-repository.interface.js';
import type { ISaleRepository } from '../../repositories/sale-repository.interface.js';
import type { IBarberRepository } from '../../repositories/barber-repository.interface.js';

export interface MarkTabPaidRequest {
  tabId: string;
  method: 'cash' | 'bank_transfer';
  tipAmount: number;
  shopId: number;
}

export class MarkTabPaid {
  constructor(
    private tabRepo: ITabRepository,
    private saleRepo: ISaleRepository,
    private barberRepo: IBarberRepository,
  ) {}

  async execute(req: MarkTabPaidRequest): Promise<{ saleId: number }> {
    const { tabId, method, tipAmount, shopId } = req;

    const tab = this.tabRepo.findById(tabId);
    if (!tab) throw new Error(`Tab ${tabId} not found`);
    if (tab.status === 'paid') throw new Error('Tab is already paid');

    const barber = await this.barberRepo.findById(tab.barber_id);
    if (!barber) throw new Error('Barber not found');

    const saleItems = tab.items.map(item => ({
      item_id: 0,
      item_name: item.name,
      type: 'service' as const,
      price: item.price,
    }));

    const totalAmount = tab.amount + tipAmount;

    const saleId = await this.saleRepo.create(
      {
        barber_id: tab.barber_id,
        barber_name: barber.name,
        customer_id: tab.customer_id,
        total_amount: totalAmount,
        tip_amount: tipAmount,
        tax_amount: 0,
        discount_amount: 0,
        customer_email: null,
        customer_phone: tab.customer_phone,
        shop_id: shopId,
      },
      saleItems,
    );

    const now = new Date().toISOString();
    this.tabRepo.updateStatus(tabId, 'paid', {
      paid_at: now,
      paid_method: method,
      paid_sale_id: saleId,
      tip_on_payback: tipAmount > 0 ? tipAmount : undefined,
    });

    return { saleId };
  }
}
