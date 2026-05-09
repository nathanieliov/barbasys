import type { ISaleRepository } from '../../repositories/sale-repository.interface.js';
import type { ICustomerRepository } from '../../repositories/customer-repository.interface.js';
import type { IConversationRepository } from '../../repositories/conversation-repository.interface.js';
import type { IWhatsAppClient } from '../../adapters/whatsapp/whatsapp-client.interface.js';
import { sendReceipt } from '../../communication.js';
import { isInSessionWindow } from '../chatbot/session-window.js';

export interface ResendReceiptRequest {
  saleId: number;
  shopId: number;
  email: string | null;
  phone: string | null;
}

export class ResendReceipt {
  constructor(
    private saleRepo: ISaleRepository,
    private customerRepo: ICustomerRepository,
    private convRepo: IConversationRepository,
    private whatsAppClient?: IWhatsAppClient,
  ) {}

  async execute({ saleId, shopId, email, phone }: ResendReceiptRequest): Promise<{ channels: string[] }> {
    const cleanEmail = email?.trim() || null;
    const cleanPhone = phone?.trim() || null;
    if (!cleanEmail && !cleanPhone) {
      throw new Error('At least an email or phone number is required.');
    }

    const sale = await this.saleRepo.findById(saleId);
    if (!sale || sale.shop_id !== shopId) {
      throw new Error('Sale not found.');
    }

    await this.saleRepo.updateContactInfo(saleId, cleanEmail, cleanPhone);

    let waOptIn = false;
    let lastInboundAt: string | null = null;
    if (cleanPhone) {
      const customer = await this.customerRepo.findByEmailOrPhone(cleanEmail, cleanPhone, shopId);
      waOptIn = customer?.wa_opt_in === 1;
      const conversation = await this.convRepo.findByPhone(cleanPhone);
      lastInboundAt = conversation?.last_inbound_at ?? null;
    }

    await sendReceipt({
      id: saleId,
      customer_email: cleanEmail || sale.customer_email || undefined,
      customer_phone: cleanPhone || sale.customer_phone || undefined,
      total_amount: sale.total_amount,
      tip_amount: sale.tip_amount,
      discount_amount: sale.discount_amount,
      items: [],
      barber_name: sale.barber_name,
      wa_opt_in: waOptIn,
      last_inbound_at: lastInboundAt,
    }, this.whatsAppClient);

    const channels: string[] = [];
    if (cleanEmail) channels.push('email');
    if (cleanPhone) {
      if (waOptIn && lastInboundAt && isInSessionWindow(lastInboundAt)) channels.push('whatsapp');
      else channels.push('sms');
    }
    return { channels };
  }
}
