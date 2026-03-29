import { describe, it, expect, vi } from 'vitest';
import { ExportSalesCSV } from './ExportSalesCSV';
import { ISaleRepository } from '../../repositories/sale-repository.interface';

describe('ExportSalesCSV', () => {
  const mockSaleRepo = {
    findDetailedInRange: vi.fn()
  } as unknown as ISaleRepository;

  const exportSalesCSV = new ExportSalesCSV(mockSaleRepo);

  it('should generate CSV with correct headers and data', async () => {
    const mockSales = [
      {
        id: 1,
        timestamp: '2026-03-29T10:00:00Z',
        barber_name: 'Nathaniel',
        customer_email: 'test@example.com',
        total_amount: 45,
        tip_amount: 5,
        discount_amount: 3,
        items: [
          { item_name: 'Haircut', price: 25 },
          { item_name: 'Pomade', price: 18 }
        ]
      }
    ];

    (mockSaleRepo.findDetailedInRange as any).mockResolvedValue(mockSales);

    const csv = await exportSalesCSV.execute({
      startDate: '2026-03-29',
      endDate: '2026-03-29',
      shop_id: 1
    });

    const lines = csv.split('\n');
    expect(lines[0]).toBe('Sale ID,Date,Time,Barber,Customer Email,Items,Subtotal,Discount,Tip,Total');
    
    const dataParts = lines[1].split(',');
    expect(dataParts[0]).toBe('1');
    expect(dataParts[3]).toBe('Nathaniel');
    expect(dataParts[4]).toBe('test@example.com');
    expect(dataParts[5]).toBe('"Haircut ($25); Pomade ($18)"');
    expect(dataParts[6]).toBe('43.00'); // 45 - 5 + 3
    expect(dataParts[7]).toBe('3.00');
    expect(dataParts[8]).toBe('5.00');
    expect(dataParts[9]).toBe('45.00');
  });

  it('should handle empty results', async () => {
    (mockSaleRepo.findDetailedInRange as any).mockResolvedValue([]);

    const csv = await exportSalesCSV.execute({
      startDate: '2026-03-29',
      endDate: '2026-03-29',
      shop_id: 1
    });

    expect(csv).toBe('Sale ID,Date,Time,Barber,Customer Email,Items,Subtotal,Discount,Tip,Total');
  });
});
