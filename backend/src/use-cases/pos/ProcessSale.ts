import { ISaleRepository } from '../../repositories/sale-repository.interface.js';
import { ICustomerRepository } from '../../repositories/customer-repository.interface.js';
import { IBarberRepository } from '../../repositories/barber-repository.interface.js';
import { IProductRepository } from '../../repositories/product-repository.interface.js';
import type { IConversationRepository } from '../../repositories/conversation-repository.interface.js';
import type { IWhatsAppClient } from '../../adapters/whatsapp/whatsapp-client.interface.js';
import { sendReceipt, alertLowStock } from '../../communication.js';
import { Database } from 'better-sqlite3';

export interface ProcessSaleRequest {
  barber_id: number;
  items: Array<{
    id: number;
    name: string;
    type: 'service' | 'product';
    price: number;
    quantity?: number;
  }>;
  customer_email?: string | null;
  customer_phone?: string | null;
  tip_amount?: number;
  discount_amount?: number;
  shop_id: number;
  appointment_id?: number | null;
}

export class ProcessSale {
  constructor(
    private saleRepo: ISaleRepository,
    private customerRepo: ICustomerRepository,
    private barberRepo: IBarberRepository,
    private productRepo: IProductRepository,
    private db: Database,
    private convRepo?: IConversationRepository,
    private whatsAppClient?: IWhatsAppClient,
  ) {}

  async execute(request: ProcessSaleRequest) {
    let { barber_id, items, customer_email, customer_phone, tip_amount, discount_amount, shop_id, appointment_id } = request;

    // Normalize values
    tip_amount = tip_amount || 0;
    discount_amount = discount_amount || 0;
    customer_email = customer_email?.trim() || null;
    customer_phone = customer_phone?.trim() || null;

    if (!barber_id || !items || !Array.isArray(items)) {
      throw new Error('Missing required sale data');
    }

    const barber = await this.barberRepo.findById(barber_id);
    if (!barber) {
      throw new Error('Barber not found');
    }

    // Fetch tax rate from settings
    const taxSetting = this.db.prepare('SELECT value FROM shop_settings WHERE shop_id = ? AND key = ?').get(shop_id, 'default_tax_rate') as { value: string } | undefined;
    const taxRate = parseFloat(taxSetting?.value || '0');

    const total_items_amount = items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity ?? 1), 0);
    const taxable_amount = Math.max(0, total_items_amount - discount_amount);
    const tax_amount = taxable_amount * (taxRate / 100);
    const total_amount = taxable_amount + tax_amount + tip_amount;

    let customerId: number | null = null;
    if (customer_email || customer_phone) {
      const customer = await this.customerRepo.findByEmailOrPhone(customer_email, customer_phone);
      if (customer) {
        customerId = customer.id;
        await this.customerRepo.updateLastVisit(customerId);
      } else {
        customerId = await this.customerRepo.create({
          email: customer_email,
          phone: customer_phone,
          last_visit: new Date().toISOString(),
          shop_id
        } as any);
      }
    }

    if (!customerId) {
      customerId = await this.customerRepo.findOrCreateWalkIn(shop_id);
    }

    // Create sale + optionally mark appointment completed in a single transaction
    let saleId: number;
    const runCreate = this.db.transaction(() => {
      const info = (this.db as any).prepare(
        'INSERT INTO sales (barber_id, barber_name, customer_id, total_amount, tip_amount, tax_amount, discount_amount, customer_email, customer_phone, shop_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(barber_id, barber.fullname || barber.name, customerId, total_amount, tip_amount, tax_amount, discount_amount, customer_email, customer_phone, shop_id);
      const newSaleId = Number(info.lastInsertRowid);

      for (const item of items) {
        const qty = item.quantity ?? 1;
        for (let q = 0; q < qty; q++) {
          (this.db as any).prepare(
            'INSERT INTO sale_items (sale_id, item_id, item_name, type, price) VALUES (?, ?, ?, ?, ?)'
          ).run(newSaleId, item.id, item.name, item.type, item.price);
        }
      }

      if (appointment_id) {
        (this.db as any).prepare("UPDATE appointments SET status = 'completed' WHERE id = ?").run(appointment_id);
      }

      return newSaleId;
    });

    saleId = runCreate();

    for (const item of items) {
      if (item.type === 'product') {
        const qty = item.quantity ?? 1;
        await this.productRepo.reduceStock(item.id, qty, saleId);
        
        const product = await this.productRepo.findById(item.id);
        if (product && product.stock <= product.min_stock_threshold) {
          alertLowStock({ name: product.name, stock: product.stock, threshold: product.min_stock_threshold });
        }
      }
    }

    // Look up customer wa_opt_in and conversation last_inbound_at for WhatsApp routing
    let waOptIn = false;
    let lastInboundAt: string | null = null;
    if (customer_phone && this.convRepo) {
      const customer = await this.customerRepo.findByEmailOrPhone(customer_email, customer_phone, shop_id);
      waOptIn = customer?.wa_opt_in === 1;
      const conversation = await this.convRepo.findByPhone(customer_phone);
      lastInboundAt = conversation?.last_inbound_at ?? null;
    }

    // Send receipt asynchronously
    sendReceipt({
      id: saleId,
      customer_email: customer_email || undefined,
      customer_phone: customer_phone || undefined,
      total_amount,
      tip_amount,
      discount_amount,
      items,
      barber_name: barber.fullname || barber.name || 'Professional',
      wa_opt_in: waOptIn,
      last_inbound_at: lastInboundAt,
    }, this.whatsAppClient);

    return { success: true, saleId };
  }
}
