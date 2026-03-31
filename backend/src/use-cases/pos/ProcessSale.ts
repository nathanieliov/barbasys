import { ISaleRepository } from '../../repositories/sale-repository.interface.js';
import { ICustomerRepository } from '../../repositories/customer-repository.interface.js';
import { IBarberRepository } from '../../repositories/barber-repository.interface.js';
import { IProductRepository } from '../../repositories/product-repository.interface.js';
import { sendReceipt, alertLowStock } from '../../communication.js';

export interface ProcessSaleRequest {
  barber_id: number;
  items: Array<{
    id: number;
    name: string;
    type: 'service' | 'product';
    price: number;
  }>;
  customer_email?: string | null;
  customer_phone?: string | null;
  tip_amount?: number;
  discount_amount?: number;
  shop_id: number;
}

export class ProcessSale {
  constructor(
    private saleRepo: ISaleRepository,
    private customerRepo: ICustomerRepository,
    private barberRepo: IBarberRepository,
    private productRepo: IProductRepository
  ) {}

  async execute(request: ProcessSaleRequest) {
    let { barber_id, items, customer_email, customer_phone, tip_amount, discount_amount, shop_id } = request;

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

    const total_items_amount = items.reduce((sum, item) => sum + (item.price || 0), 0);
    const total_amount = Math.max(0, total_items_amount + tip_amount - discount_amount);

    let customerId = null;
    if (customer_email || customer_phone) {
      const customer = await this.customerRepo.findByEmailOrPhone(customer_email, customer_phone);
      if (customer) {
        customerId = customer.id;
        await this.customerRepo.updateLastVisit(customerId);
      } else {
        customerId = await this.customerRepo.create({
          email: customer_email,
          phone: customer_phone,
          last_visit: new Date().toISOString()
        });
      }
    }

    const saleId = await this.saleRepo.create({
      barber_id,
      barber_name: barber.fullname || barber.name,
      customer_id: customerId,
      total_amount,
      tip_amount,
      discount_amount,
      customer_email,
      customer_phone,
      shop_id
    }, items.map(item => ({
      item_id: item.id,
      item_name: item.name,
      type: item.type,
      price: item.price
    })));

    for (const item of items) {
      if (item.type === 'product') {
        await this.productRepo.reduceStock(item.id, 1, saleId);
        
        const product = await this.productRepo.findById(item.id);
        if (product && product.stock <= product.min_stock_threshold) {
          alertLowStock({ name: product.name, stock: product.stock, threshold: product.min_stock_threshold });
        }
      }
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
      barber_name: barber.fullname || barber.name || 'Professional'
    });

    return { success: true, saleId };
  }
}
