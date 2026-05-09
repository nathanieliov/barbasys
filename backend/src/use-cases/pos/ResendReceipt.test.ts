import { describe, it, expect, beforeAll, vi } from 'vitest';
import db from '../../db.js';
import { SQLiteSaleRepository } from '../../repositories/sqlite-sale-repository.js';
import { SQLiteCustomerRepository } from '../../repositories/sqlite-customer-repository.js';
import { SqliteConversationRepository } from '../../repositories/sqlite-conversation-repository.js';
import { ResendReceipt } from './ResendReceipt.js';

vi.mock('../../communication.js', () => ({
  sendReceipt: vi.fn().mockResolvedValue(undefined),
}));
import { sendReceipt } from '../../communication.js';

describe('ResendReceipt', () => {
  let saleRepo: SQLiteSaleRepository;
  let customerRepo: SQLiteCustomerRepository;
  let convRepo: SqliteConversationRepository;
  let useCase: ResendReceipt;
  let shopId: number;
  let barberId: number;
  let saleId: number;

  beforeAll(async () => {
    saleRepo = new SQLiteSaleRepository(db);
    customerRepo = new SQLiteCustomerRepository(db);
    convRepo = new SqliteConversationRepository(db);
    useCase = new ResendReceipt(saleRepo, customerRepo, convRepo);

    const shop = db.prepare('INSERT INTO shops (name, phone) VALUES (?, ?)').run('Resend Test', '+15550001111');
    shopId = shop.lastInsertRowid as number;
    const barber = db.prepare('INSERT INTO barbers (name, fullname, payment_model, service_commission_rate, product_commission_rate, shop_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run('Juan', 'Juan G', 'COMMISSION', 0.2, 0.15, shopId, 1);
    barberId = barber.lastInsertRowid as number;
    saleId = await saleRepo.create(
      { barber_id: barberId, barber_name: 'Juan G', customer_id: null, total_amount: 50, tip_amount: 0, tax_amount: 0, discount_amount: 0, customer_email: null, customer_phone: null, shop_id: shopId },
      [{ item_id: 1, item_name: 'Cut', type: 'service', price: 50 }]
    );
  });

  it('throws when both email and phone are missing', async () => {
    await expect(useCase.execute({ saleId, shopId, email: null, phone: null }))
      .rejects.toThrow(/at least/i);
  });

  it('throws when sale does not exist', async () => {
    await expect(useCase.execute({ saleId: 999999, shopId, email: 'x@y.com', phone: null }))
      .rejects.toThrow(/not found/i);
  });

  it('throws when sale belongs to a different shop', async () => {
    const otherShop = db.prepare('INSERT INTO shops (name, phone) VALUES (?, ?)').run('Other', '+15558888888').lastInsertRowid as number;
    await expect(useCase.execute({ saleId, shopId: otherShop, email: 'x@y.com', phone: null }))
      .rejects.toThrow(/not found/i);
  });

  it('updates sale with new email and calls sendReceipt', async () => {
    vi.mocked(sendReceipt).mockClear();
    const result = await useCase.execute({ saleId, shopId, email: 'alice@example.com', phone: null });

    const updated = await saleRepo.findById(saleId);
    expect(updated?.customer_email).toBe('alice@example.com');
    expect(sendReceipt).toHaveBeenCalledTimes(1);
    expect(sendReceipt).toHaveBeenCalledWith(
      expect.objectContaining({ id: saleId, customer_email: 'alice@example.com' }),
      undefined
    );
    expect(result.channels).toEqual(['email']);
  });

  it('returns whatsapp + email channels when phone added with active wa session', async () => {
    vi.mocked(sendReceipt).mockClear();
    const phone = '+15557654321';
    db.prepare('INSERT INTO customers (name, email, phone, wa_opt_in, shop_id) VALUES (?, ?, ?, ?, ?)').run('Bob', null, phone, 1, shopId);
    db.prepare("INSERT INTO conversations (wa_phone, language, state, last_inbound_at, created_at, updated_at) VALUES (?, 'es', 'idle', datetime('now'), datetime('now'), datetime('now'))").run(phone);

    const result = await useCase.execute({ saleId, shopId, email: 'alice@example.com', phone });
    expect(result.channels).toEqual(expect.arrayContaining(['email', 'whatsapp']));
  });
});
