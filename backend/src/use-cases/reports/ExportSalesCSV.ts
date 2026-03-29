import { ISaleRepository } from '../../repositories/sale-repository.interface.js';

export interface ExportSalesCSVRequest {
  startDate: string;
  endDate: string;
  shop_id: number;
  barber_id?: number;
}

export class ExportSalesCSV {
  constructor(private saleRepo: ISaleRepository) {}

  async execute(request: ExportSalesCSVRequest): Promise<string> {
    const { startDate, endDate, shop_id, barber_id } = request;
    const sales = await this.saleRepo.findDetailedInRange(startDate, endDate, shop_id, barber_id);

    const headers = ['Sale ID', 'Date', 'Time', 'Barber', 'Customer Email', 'Items', 'Subtotal', 'Discount', 'Tip', 'Total'];
    const rows = sales.map(sale => {
      const date = new Date(sale.timestamp);
      const itemsStr = sale.items.map(i => `${i.item_name} ($${i.price})`).join('; ');
      const subtotal = sale.total_amount - sale.tip_amount + sale.discount_amount;
      
      return [
        sale.id,
        date.toISOString().split('T')[0],
        date.toLocaleTimeString(),
        sale.barber_name,
        sale.customer_email || 'N/A',
        `"${itemsStr}"`,
        subtotal.toFixed(2),
        sale.discount_amount.toFixed(2),
        sale.tip_amount.toFixed(2),
        sale.total_amount.toFixed(2)
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
  }
}
