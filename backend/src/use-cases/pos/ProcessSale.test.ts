import { describe, it, expect, beforeAll, vi } from 'vitest';
import db from '../../db.js';
import { SQLiteSaleRepository } from '../../repositories/sqlite-sale-repository.js';
import { SQLiteCustomerRepository } from '../../repositories/sqlite-customer-repository.js';
import { SQLiteBarberRepository } from '../../repositories/sqlite-barber-repository.js';
import { SQLiteProductRepository } from '../../repositories/sqlite-product-repository.js';
import { SqliteConversationRepository } from '../../repositories/sqlite-conversation-repository.js';
import { ProcessSale } from './ProcessSale.js';

vi.mock('../../communication.js', () => ({
  sendReceipt: vi.fn().mockResolvedValue(undefined),
  alertLowStock: vi.fn(),
}));
import { sendReceipt } from '../../communication.js';

describe('ProcessSale receipt wiring', () => {
  let useCase: ProcessSale;
  let shopId: number;
  let barberId: number;
  const fakeWhatsAppClient = { sendText: vi.fn(), sendList: vi.fn() } as any;

  beforeAll(() => {
    const saleRepo = new SQLiteSaleRepository(db);
    const customerRepo = new SQLiteCustomerRepository(db);
    const barberRepo = new SQLiteBarberRepository(db);
    const productRepo = new SQLiteProductRepository(db);
    const convRepo = new SqliteConversationRepository(db);

    const shop = db.prepare('INSERT INTO shops (name, phone) VALUES (?, ?)').run('Process Test', '+15550002222');
    shopId = shop.lastInsertRowid as number;
    const barber = db.prepare('INSERT INTO barbers (name, fullname, payment_model, service_commission_rate, product_commission_rate, shop_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run('Sami', 'Sami P', 'COMMISSION', 0.2, 0.15, shopId, 1);
    barberId = barber.lastInsertRowid as number;

    useCase = new ProcessSale(saleRepo, customerRepo, barberRepo, productRepo, db, convRepo, fakeWhatsAppClient);
  });

  it('passes whatsAppClient and customer wa_opt_in into sendReceipt', async () => {
    vi.mocked(sendReceipt).mockClear();
    const phone = '+15553334444';
    db.prepare('INSERT INTO customers (name, email, phone, wa_opt_in, shop_id) VALUES (?, ?, ?, ?, ?)').run('Wa Cust', null, phone, 1, shopId);
    db.prepare("INSERT INTO conversations (wa_phone, language, state, last_inbound_at, created_at, updated_at) VALUES (?, 'es', 'idle', datetime('now'), datetime('now'), datetime('now'))").run(phone);

    await useCase.execute({
      barber_id: barberId,
      items: [{ id: 1, name: 'Cut', type: 'service', price: 30 }],
      customer_phone: phone,
      shop_id: shopId,
    });

    expect(sendReceipt).toHaveBeenCalledTimes(1);
    const [payload, client] = vi.mocked(sendReceipt).mock.calls[0];
    expect(payload.wa_opt_in).toBe(true);
    expect(payload.last_inbound_at).toBeTruthy();
    expect(client).toBe(fakeWhatsAppClient);
  });

  it('still works without whatsAppClient or conversation repo', async () => {
    vi.mocked(sendReceipt).mockClear();
    const saleRepo = new SQLiteSaleRepository(db);
    const customerRepo = new SQLiteCustomerRepository(db);
    const barberRepo = new SQLiteBarberRepository(db);
    const productRepo = new SQLiteProductRepository(db);
    const useCaseNoWa = new ProcessSale(saleRepo, customerRepo, barberRepo, productRepo, db);

    await useCaseNoWa.execute({
      barber_id: barberId,
      items: [{ id: 1, name: 'Cut', type: 'service', price: 30 }],
      shop_id: shopId,
    });

    expect(sendReceipt).toHaveBeenCalledTimes(1);
    const [, client] = vi.mocked(sendReceipt).mock.calls[0];
    expect(client).toBeUndefined();
  });
});
