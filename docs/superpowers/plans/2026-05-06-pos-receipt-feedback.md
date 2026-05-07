# POS Receipt Feedback + Retroactive Send Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show "Receipt sent to ..." status on the POS success card, give cashiers a "Send receipt" button + modal to retroactively send when contact info was missed, and finally activate the WhatsApp delivery branch in `sendReceipt` (currently dead code).

**Architecture:** Add a `ResendReceipt` use-case that looks up the sale, updates its contact info, and triggers `sendReceipt`. Plumb a `TwilioWhatsAppClient` and a `conversationRepo` lookup into both `ProcessSale` and `ResendReceipt` so the existing WhatsApp branch in `sendReceipt` finally fires. UI: replace the boolean `saleSuccess` with a `successInfo` object so the card knows what was sent and to whom; add a small Modal-based resend form.

**Tech Stack:** Node/Express + better-sqlite3 backend; React 18 + Vite frontend; vitest for both. Twilio SDK + nodemailer already wired.

**Spec:** `docs/superpowers/specs/2026-05-06-pos-receipt-feedback-design.md`

**Spec amendment:** The spec said "look up `wa_opt_in + last_inbound_at` via `findByEmailOrPhone`" — but `last_inbound_at` lives on the `conversations` table, not `customers`. Plan uses `conversationRepo.findByPhone()` for that field.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `backend/src/repositories/sale-repository.interface.ts` | Modify | Add `updateContactInfo` to `ISaleRepository` |
| `backend/src/repositories/sqlite-sale-repository.ts` | Modify | Implement `updateContactInfo` |
| `backend/src/repositories/sqlite-sale-repository.test.ts` | Modify or create | Test for `updateContactInfo` |
| `backend/src/use-cases/pos/ProcessSale.ts` | Modify | Wire WhatsApp + conversation lookup into `sendReceipt` call |
| `backend/src/use-cases/pos/ProcessSale.test.ts` | Create | Tests for ProcessSale receipt wiring |
| `backend/src/use-cases/pos/ResendReceipt.ts` | Create | New use case |
| `backend/src/use-cases/pos/ResendReceipt.test.ts` | Create | Use case tests |
| `backend/src/index.ts` | Modify | Construct shared `TwilioWhatsAppClient`, wire `processSale` and `ResendReceipt`, mount new route |
| `frontend/src/locales/en-US.json` | Modify | 5 new `pos.*` keys |
| `frontend/src/locales/es-DO.json` | Modify | 5 new `pos.*` keys |
| `frontend/src/pages/POS.tsx` | Modify | Replace `saleSuccess` boolean with `successInfo` object, update success card, add resend modal |
| `frontend/src/pages/POS.test.tsx` | Create | Smoke + behavior tests for the resend flow |

---

### Task 1: Add `updateContactInfo` to the sale repository

**Files:**
- Modify: `backend/src/repositories/sale-repository.interface.ts`
- Modify: `backend/src/repositories/sqlite-sale-repository.ts`
- Create: `backend/src/repositories/sqlite-sale-repository.test.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/src/repositories/sqlite-sale-repository.test.ts`:

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import db from '../db.js';
import { SQLiteSaleRepository } from './sqlite-sale-repository.js';

describe('SQLiteSaleRepository.updateContactInfo', () => {
  let repo: SQLiteSaleRepository;
  let shopId: number;
  let barberId: number;
  let saleId: number;

  beforeAll(async () => {
    repo = new SQLiteSaleRepository(db);
    const shop = db.prepare('INSERT INTO shops (name, phone) VALUES (?, ?)').run('Receipt Test', '+15550000000');
    shopId = shop.lastInsertRowid as number;
    const barber = db.prepare('INSERT INTO barbers (name, fullname, payment_model, service_commission_rate, product_commission_rate, shop_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run('Carlos', 'Carlos R', 'COMMISSION', 0.2, 0.15, shopId, 1);
    barberId = barber.lastInsertRowid as number;
    saleId = await repo.create(
      { barber_id: barberId, barber_name: 'Carlos R', customer_id: null, total_amount: 30, tip_amount: 0, tax_amount: 0, discount_amount: 0, customer_email: null, customer_phone: null, shop_id: shopId },
      [{ item_id: 1, item_name: 'Cut', type: 'service', price: 30 }]
    );
  });

  it('sets only email when only email is provided', async () => {
    await repo.updateContactInfo(saleId, 'alice@example.com', null);
    const row = await repo.findById(saleId);
    expect(row?.customer_email).toBe('alice@example.com');
    expect(row?.customer_phone).toBeNull();
  });

  it('sets only phone when only phone is provided', async () => {
    await repo.updateContactInfo(saleId, null, '+15551234567');
    const row = await repo.findById(saleId);
    expect(row?.customer_phone).toBe('+15551234567');
    expect(row?.customer_email).toBe('alice@example.com'); // unchanged from previous test
  });

  it('sets both when both are provided', async () => {
    await repo.updateContactInfo(saleId, 'bob@example.com', '+15559999999');
    const row = await repo.findById(saleId);
    expect(row?.customer_email).toBe('bob@example.com');
    expect(row?.customer_phone).toBe('+15559999999');
  });

  it('is a no-op when both are null', async () => {
    const before = await repo.findById(saleId);
    await repo.updateContactInfo(saleId, null, null);
    const after = await repo.findById(saleId);
    expect(after?.customer_email).toBe(before?.customer_email);
    expect(after?.customer_phone).toBe(before?.customer_phone);
  });
});
```

- [ ] **Step 2: Run, confirm fail**

```bash
cd backend && npx vitest run src/repositories/sqlite-sale-repository.test.ts
```
Expected: FAIL — `updateContactInfo` is not a function.

- [ ] **Step 3: Update the interface**

In `backend/src/repositories/sale-repository.interface.ts`, append to the `ISaleRepository` interface:

```ts
  updateContactInfo(saleId: number, email: string | null, phone: string | null): Promise<void>;
```

- [ ] **Step 4: Implement in SQLite repo**

In `backend/src/repositories/sqlite-sale-repository.ts`, add a method on the class (alongside the others):

```ts
  async updateContactInfo(saleId: number, email: string | null, phone: string | null): Promise<void> {
    const sets: string[] = [];
    const args: (string | number)[] = [];
    if (email !== null) { sets.push('customer_email = ?'); args.push(email); }
    if (phone !== null) { sets.push('customer_phone = ?'); args.push(phone); }
    if (sets.length === 0) return;
    args.push(saleId);
    this.db.prepare(`UPDATE sales SET ${sets.join(', ')} WHERE id = ?`).run(...args);
  }
```

- [ ] **Step 5: Run, confirm PASS**

```bash
cd backend && npx vitest run src/repositories/sqlite-sale-repository.test.ts
```
Expected: 4 passing.

- [ ] **Step 6: Run full backend suite**

```bash
npm test --prefix backend 2>&1 | tail -3
```
Expected: 273 + 4 = 277 passing.

- [ ] **Step 7: Commit**

```bash
git add backend/src/repositories/sale-repository.interface.ts backend/src/repositories/sqlite-sale-repository.ts backend/src/repositories/sqlite-sale-repository.test.ts
git commit -m "feat(repo): add SaleRepository.updateContactInfo

Allows retroactively setting customer_email and/or customer_phone on
an existing sale row. Used by the upcoming ResendReceipt use case.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Create the `ResendReceipt` use case

**Files:**
- Create: `backend/src/use-cases/pos/ResendReceipt.ts`
- Create: `backend/src/use-cases/pos/ResendReceipt.test.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/src/use-cases/pos/ResendReceipt.test.ts`:

```ts
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
      undefined  // no whatsAppClient passed in this test
    );
    expect(result.channels).toEqual(['email']);
  });

  it('returns whatsapp + email channels when phone added with active wa session', async () => {
    vi.mocked(sendReceipt).mockClear();
    // Create a customer with wa_opt_in=1, plus a conversation with recent last_inbound_at
    const phone = '+15557654321';
    db.prepare('INSERT INTO customers (name, email, phone, wa_opt_in, shop_id) VALUES (?, ?, ?, ?, ?)').run('Bob', null, phone, 1, shopId);
    db.prepare("INSERT INTO conversations (wa_phone, language, state, last_inbound_at, created_at, updated_at) VALUES (?, 'es', 'idle', datetime('now'), datetime('now'), datetime('now'))").run(phone);

    const result = await useCase.execute({ saleId, shopId, email: 'alice@example.com', phone });
    expect(result.channels).toEqual(expect.arrayContaining(['email', 'whatsapp']));
  });
});
```

- [ ] **Step 2: Run, confirm fail**

```bash
cd backend && npx vitest run src/use-cases/pos/ResendReceipt.test.ts
```
Expected: FAIL — `ResendReceipt` does not exist.

- [ ] **Step 3: Create the use case**

Create `backend/src/use-cases/pos/ResendReceipt.ts`:

```ts
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
```

Note: items are not retrieved — the receipt body lists items but for v1 of resend we send a summary with no line-items (sale_items aren't easily reconstructed without another repo method). This matches the spec's "v1 simplicity" stance and can be enhanced later by extending `ISaleRepository.findById` to return items.

- [ ] **Step 4: Run, confirm PASS**

```bash
cd backend && npx vitest run src/use-cases/pos/ResendReceipt.test.ts
```
Expected: 5 passing.

- [ ] **Step 5: Run full backend suite**

```bash
npm test --prefix backend 2>&1 | tail -3
```
Expected: 277 + 5 = 282 passing.

- [ ] **Step 6: Commit**

```bash
git add backend/src/use-cases/pos/ResendReceipt.ts backend/src/use-cases/pos/ResendReceipt.test.ts
git commit -m "feat(pos): ResendReceipt use case

Validates input, updates the sale's contact info, looks up the
customer's wa_opt_in plus the conversation's last_inbound_at, then
calls sendReceipt with the WhatsApp client. Returns the inferred
delivery channels for UI feedback.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Wire WhatsApp into `ProcessSale`

**Files:**
- Modify: `backend/src/use-cases/pos/ProcessSale.ts`
- Create: `backend/src/use-cases/pos/ProcessSale.test.ts`

- [ ] **Step 1: Write a focused test**

Create `backend/src/use-cases/pos/ProcessSale.test.ts`:

```ts
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
```

- [ ] **Step 2: Run, confirm fail**

```bash
cd backend && npx vitest run src/use-cases/pos/ProcessSale.test.ts
```
Expected: FAIL — constructor doesn't accept the new args.

- [ ] **Step 3: Modify `ProcessSale.ts`**

Update the imports and constructor signature in `backend/src/use-cases/pos/ProcessSale.ts`:

```ts
import { ISaleRepository } from '../../repositories/sale-repository.interface.js';
import { ICustomerRepository } from '../../repositories/customer-repository.interface.js';
import { IBarberRepository } from '../../repositories/barber-repository.interface.js';
import { IProductRepository } from '../../repositories/product-repository.interface.js';
import type { IConversationRepository } from '../../repositories/conversation-repository.interface.js';
import type { IWhatsAppClient } from '../../adapters/whatsapp/whatsapp-client.interface.js';
import { sendReceipt, alertLowStock } from '../../communication.js';
import { Database } from 'better-sqlite3';
```

Update the class constructor and `sendReceipt` call:

```ts
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

  // ... existing execute() body unchanged until the sendReceipt block ...
```

Replace the existing fire-and-forget `sendReceipt({...})` call (around line 116) with:

```ts
    // Look up customer wa_opt_in and conversation last_inbound_at for WhatsApp routing
    let waOptIn = false;
    let lastInboundAt: string | null = null;
    if (customer_phone && this.convRepo) {
      const customer = await this.customerRepo.findByEmailOrPhone(customer_email, customer_phone, shop_id);
      waOptIn = customer?.wa_opt_in === 1;
      const conversation = await this.convRepo.findByPhone(customer_phone);
      lastInboundAt = conversation?.last_inbound_at ?? null;
    }

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
```

- [ ] **Step 4: Run, confirm PASS**

```bash
cd backend && npx vitest run src/use-cases/pos/ProcessSale.test.ts
```
Expected: 2 passing.

- [ ] **Step 5: Run full suite**

```bash
npm test --prefix backend 2>&1 | tail -3
```
Expected: 282 + 2 = 284 passing.

- [ ] **Step 6: Commit**

```bash
git add backend/src/use-cases/pos/ProcessSale.ts backend/src/use-cases/pos/ProcessSale.test.ts
git commit -m "feat(pos): wire WhatsApp client + conversation lookup into ProcessSale

Constructor gains optional conversationRepo + whatsAppClient. Before
sending the receipt, ProcessSale now looks up the customer's wa_opt_in
flag and the conversation's last_inbound_at, then passes them and the
WhatsApp client into sendReceipt. The previously dead WhatsApp branch
in sendReceipt now fires for opted-in customers in their session window.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Mount `POST /api/sales/:id/resend-receipt` and wire constructors in `index.ts`

**Files:**
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Construct shared `TwilioWhatsAppClient` near the top of `index.ts`**

After the `dotenv/config` + `validateEnv()` lines and after other imports, add:

```ts
import twilio from 'twilio';
import { TwilioWhatsAppClient } from './adapters/whatsapp/twilio-whatsapp-client.js';
import { SqliteConversationRepository } from './repositories/sqlite-conversation-repository.js';
import { ResendReceipt } from './use-cases/pos/ResendReceipt.js';
```

Then, alongside the existing repository instantiations (search for `const saleRepo = new SQLiteSaleRepository(db);`), add:

```ts
const conversationRepo = new SqliteConversationRepository(db);
const whatsAppClient = new TwilioWhatsAppClient(
  twilio(process.env.TWILIO_ACCOUNT_SID || '', process.env.TWILIO_AUTH_TOKEN || ''),
  process.env.TWILIO_FROM_NUMBER || 'whatsapp:+14155238886',
);
```

- [ ] **Step 2: Update `processSale` construction**

Find:
```ts
const processSale = new ProcessSale(saleRepo, customerRepo, barberRepo, productRepo, db);
```

Replace with:

```ts
const processSale = new ProcessSale(saleRepo, customerRepo, barberRepo, productRepo, db, conversationRepo, whatsAppClient);
```

- [ ] **Step 3: Construct `ResendReceipt` use case**

Below the `processSale` line, add:

```ts
const resendReceiptUseCase = new ResendReceipt(saleRepo, customerRepo, conversationRepo, whatsAppClient);
```

- [ ] **Step 4: Mount the new route**

Find the existing `app.post('/api/sales', protect, ...)` block (around line 1042). Immediately after the closing `});` of that block (and before the `app.get('/api/sales', ...)`), add:

```ts
app.post('/api/sales/:id/resend-receipt', protect, async (req, res) => {
  const shopId = req.user?.shop_id;
  if (!shopId) return res.status(400).json({ error: 'Missing shop context' });
  const saleId = parseInt(req.params.id);
  if (isNaN(saleId)) return res.status(400).json({ error: 'Invalid sale id' });

  const { email, phone } = req.body || {};
  try {
    const result = await resendReceiptUseCase.execute({
      saleId,
      shopId,
      email: email ?? null,
      phone: phone ?? null,
    });
    res.json({ success: true, channels: result.channels });
  } catch (err: any) {
    const status = /not found/i.test(err.message) ? 404 : 400;
    res.status(status).json({ error: err.message });
  }
});
```

- [ ] **Step 5: Verify build**

```bash
bash scripts/ai-verify.sh 2>&1 | grep -c "error TS"
```
Expected: 0.

- [ ] **Step 6: Run all tests (no regression)**

```bash
npm test --prefix backend 2>&1 | tail -3
```
Expected: 284 passing.

- [ ] **Step 7: Commit**

```bash
git add backend/src/index.ts
git commit -m "feat(api): POST /api/sales/:id/resend-receipt + wire WhatsApp into ProcessSale

Adds the resend endpoint backed by ResendReceipt. Constructs a shared
TwilioWhatsAppClient and SqliteConversationRepository at the composition
root and injects them into processSale. The chatbot router still owns
its own WhatsApp client instance — they read the same env vars.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 5: Add i18n keys

**Files:**
- Modify: `frontend/src/locales/en-US.json`
- Modify: `frontend/src/locales/es-DO.json`

- [ ] **Step 1: Locate the `pos` namespace**

```bash
grep -n '"pos"' frontend/src/locales/en-US.json
```

- [ ] **Step 2: Append new keys to both files**

Inside the `pos` namespace block in `en-US.json` (preserving valid JSON — comma after the previous last key):

```json
    "receipt_sent_to": "Receipt sent to {{recipients}}",
    "no_contact_info": "No contact info captured — no receipt sent.",
    "send_receipt": "Send receipt",
    "email_or_phone_required": "Enter at least an email or a phone number.",
    "send": "Send"
```

Same in `es-DO.json` with Spanish copy:

```json
    "receipt_sent_to": "Recibo enviado a {{recipients}}",
    "no_contact_info": "Sin información de contacto — no se envió recibo.",
    "send_receipt": "Enviar recibo",
    "email_or_phone_required": "Ingrese al menos un correo o teléfono.",
    "send": "Enviar"
```

(If any of these keys already exist within `pos`, leave the existing ones alone.)

- [ ] **Step 3: Verify JSON valid**

```bash
node -e "JSON.parse(require('fs').readFileSync('frontend/src/locales/en-US.json'))" && \
node -e "JSON.parse(require('fs').readFileSync('frontend/src/locales/es-DO.json'))" && \
echo OK
```
Expected: prints `OK`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/locales/en-US.json frontend/src/locales/es-DO.json
git commit -m "feat(i18n): pos receipt feedback + resend keys

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 6: POS success card — replace `saleSuccess` boolean with `successInfo` and show receipt status

**Files:**
- Modify: `frontend/src/pages/POS.tsx`
- Create: `frontend/src/pages/POS.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `frontend/src/pages/POS.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import POS from './POS';
import apiClient from '../api/apiClient';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../hooks/useAuth';
import { SettingsProvider } from '../hooks/useSettings';

vi.mock('../api/apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: any, params?: any) => {
      // Support interpolation like {{recipients}}
      const text = typeof fallback === 'string' ? fallback : key;
      if (params && typeof params === 'object') {
        return text.replace(/\{\{(\w+)\}\}/g, (_, k) => params[k] ?? '');
      }
      return text;
    },
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const mockBarbers = [{ id: 1, fullname: 'Carlos', name: 'Carlos', barber_id: 1 }];
const mockServices = [{ id: 10, name: 'Cut', duration_minutes: 30, price: 25 }];

function setupApiMocks() {
  vi.mocked(apiClient.get).mockImplementation((url: string) => {
    if (url.startsWith('/settings')) return Promise.resolve({ data: { default_tax_rate: '0' } });
    if (url.startsWith('/barbers')) return Promise.resolve({ data: mockBarbers });
    if (url.startsWith('/services')) return Promise.resolve({ data: mockServices });
    if (url.startsWith('/inventory')) return Promise.resolve({ data: [] });
    return Promise.resolve({ data: [] });
  });
  vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true, saleId: 42 } });
}

function renderPOS() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <SettingsProvider>
          <POS />
        </SettingsProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('POS receipt feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupApiMocks();
  });

  it('renders POS page with services tab', async () => {
    renderPOS();
    await waitFor(() => {
      expect(screen.getByText('Cut')).toBeInTheDocument();
    });
  });
});
```

(That's a smoke test — the deeper resend behavior tests come in Task 8 once the modal is implemented. We add the test file now so the test infra is in place for the harder cases.)

- [ ] **Step 2: Run, confirm PASS**

```bash
cd frontend && npx vitest run src/pages/POS.test.tsx
```
Expected: 1 passing (smoke test confirms test setup works).

- [ ] **Step 3: Replace `saleSuccess` with `successInfo`**

In `frontend/src/pages/POS.tsx`, find:
```tsx
const [saleSuccess, setSaleSuccess] = useState(false);
```

Replace with:
```tsx
type SuccessInfo = { id: number; email: string; phone: string };
const [successInfo, setSuccessInfo] = useState<SuccessInfo | null>(null);
```

Find:
```tsx
setSaleSuccess(true);
```

Replace with:
```tsx
setSuccessInfo({ id: response.data.saleId, email: customerEmail, phone: customerPhone });
```

Update the surrounding `await apiClient.post(...)` line to capture the response. Find:
```tsx
      await apiClient.post('/sales', {
```

Replace with:
```tsx
      const response = await apiClient.post('/sales', {
```

Find `resetPOS`:
```tsx
    setSaleSuccess(false);
```

Replace with:
```tsx
    setSuccessInfo(null);
```

- [ ] **Step 4: Update the success-card render**

Find the entire `if (saleSuccess) { return (...) }` block and replace it with:

```tsx
  if (successInfo) {
    const sentTo = [successInfo.email, successInfo.phone].filter(Boolean);
    const hasContact = sentTo.length > 0;

    return (
      <div className="card" style={{ maxWidth: 480, margin: '40px auto', padding: 36, textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--sage-soft)', display: 'grid', placeItems: 'center', margin: '0 auto 18px', color: '#4d6648' }}>
          <CheckCircle size={32} />
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, margin: '0 0 6px' }}>{t('pos.payment_successful')}</h2>
        <p className="muted" style={{ margin: '0 0 22px' }}>
          {hasContact
            ? t('pos.receipt_sent_to', 'Receipt sent to {{recipients}}', { recipients: sentTo.join(' & ') })
            : t('pos.no_contact_info', 'No contact info captured — no receipt sent.')}
        </p>
        {!hasContact && (
          <button className="btn btn-soft btn-sm" style={{ marginBottom: 12 }} onClick={() => setShowResend(true)}>
            {t('pos.send_receipt', 'Send receipt')}
          </button>
        )}
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={resetPOS}>
          {t('pos.new_transaction')}
        </button>
      </div>
    );
  }
```

(`setShowResend` will be added in Task 7. For now, declare it as a stub so the file compiles.)

Add the stub state, just below the `successInfo` state:

```tsx
const [showResend, setShowResend] = useState(false);
```

(Actually using it via the modal arrives in Task 7; for now the state is set on click but no modal renders. The button is hidden when contact info IS present, so this is harmless.)

- [ ] **Step 5: Verify build + tests still green**

```bash
bash scripts/ai-verify.sh 2>&1 | grep -c "error TS"
npm test --prefix frontend 2>&1 | tail -3
```
Expected: 0 errors. 33 + 1 = 34 passing.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/POS.tsx frontend/src/pages/POS.test.tsx
git commit -m "feat(pos): success card shows receipt status

Replaces the boolean saleSuccess with a successInfo object that
captures the sale id and the contact info we attempted to send to.
Card now shows 'Receipt sent to alice@example.com' or, when no
contact was captured, 'No contact info captured' plus a stub
'Send receipt' button (modal lands next).

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 7: Add the resend Modal to POS

**Files:**
- Modify: `frontend/src/pages/POS.tsx`

- [ ] **Step 1: Confirm `Modal` is importable**

```bash
grep -n "import Modal" frontend/src/pages/POS.tsx
```
If absent, add at the top of the imports:
```tsx
import Modal from '../components/Modal';
```

- [ ] **Step 2: Add resend state**

Just below the `showResend` line added in Task 6, add:

```tsx
const [resendEmail, setResendEmail] = useState('');
const [resendPhone, setResendPhone] = useState('');
const [resending, setResending] = useState(false);
const [resendError, setResendError] = useState('');
```

- [ ] **Step 3: Add the resend handler**

Above the `resetPOS` declaration, add:

```tsx
const handleResend = async () => {
  if (!successInfo) return;
  if (!resendEmail.trim() && !resendPhone.trim()) {
    setResendError(t('pos.email_or_phone_required', 'Enter at least an email or a phone number.'));
    return;
  }
  setResending(true);
  setResendError('');
  try {
    await apiClient.post(`/sales/${successInfo.id}/resend-receipt`, {
      email: resendEmail.trim() || null,
      phone: resendPhone.trim() || null,
    });
    setSuccessInfo({ ...successInfo, email: resendEmail.trim(), phone: resendPhone.trim() });
    setShowResend(false);
    setResendEmail('');
    setResendPhone('');
  } catch (err: any) {
    setResendError(err.response?.data?.error || 'Failed to send receipt');
  } finally {
    setResending(false);
  }
};
```

- [ ] **Step 4: Render the Modal**

In the success-card return block (the one added in Task 6), wrap the return in a fragment and add the Modal beneath the card:

```tsx
  if (successInfo) {
    const sentTo = [successInfo.email, successInfo.phone].filter(Boolean);
    const hasContact = sentTo.length > 0;

    return (
      <>
        <div className="card" style={{ maxWidth: 480, margin: '40px auto', padding: 36, textAlign: 'center' }}>
          {/* ...existing success-card body unchanged... */}
        </div>

        <Modal
          isOpen={showResend}
          onClose={() => { setShowResend(false); setResendError(''); }}
          title={t('pos.send_receipt', 'Send receipt')}
          size="sm"
          footer={
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-soft btn-sm" onClick={() => { setShowResend(false); setResendError(''); }}>
                {t('common.cancel', 'Cancel')}
              </button>
              <button className="btn btn-accent btn-sm" disabled={resending} onClick={handleResend}>
                {t('pos.send', 'Send')}
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="field">
              <label className="field-label">{t('common.email', 'Email')}</label>
              <input className="input" type="email" value={resendEmail} onChange={e => setResendEmail(e.target.value)} placeholder="alice@example.com" />
            </div>
            <div className="field">
              <label className="field-label">{t('common.phone', 'Phone')}</label>
              <input className="input" type="tel" value={resendPhone} onChange={e => setResendPhone(e.target.value)} placeholder="+1 555 123 4567" />
            </div>
            {resendError && (
              <div style={{ background: 'var(--primary-soft)', color: 'var(--primary-deep)', padding: '10px 14px', borderRadius: 'var(--r)', fontSize: 13 }}>
                {resendError}
              </div>
            )}
          </div>
        </Modal>
      </>
    );
  }
```

(Keep the `{/* existing success-card body */}` placeholder as the actual prior children — do not delete them.)

- [ ] **Step 5: Verify build**

```bash
bash scripts/ai-verify.sh 2>&1 | grep -c "error TS"
```
Expected: 0.

- [ ] **Step 6: Run frontend tests**

```bash
npm test --prefix frontend 2>&1 | tail -3
```
Expected: 34 passing (no regressions; deeper tests come in Task 8).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/POS.tsx
git commit -m "feat(pos): resend receipt modal

Adds a simple Modal-based form to retroactively send a receipt when
no contact info was captured at checkout. POSTs to the new
/sales/:id/resend-receipt endpoint and updates the success card
in place when the resend succeeds.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 8: Behavior tests for the resend flow

**Files:**
- Modify: `frontend/src/pages/POS.test.tsx`

- [ ] **Step 1: Write the failing tests**

Append to `POS.test.tsx` inside the existing `describe('POS receipt feedback', ...)` block:

```tsx
  // Helper that drives a sale from cart to success state with no contact info
  async function ringUpSaleWithoutContact() {
    renderPOS();
    // Wait for services to load and click the service tile
    const tile = await screen.findByText('Cut');
    fireEvent.click(tile);
    // Charge button — find by text/label that includes the total
    const chargeButton = await screen.findByRole('button', { name: /charge|cobrar|pay|process/i });
    fireEvent.click(chargeButton);
    // Wait for success card
    await screen.findByText(/payment successful|pago exitoso/i);
  }

  it('shows "no contact info" + Send receipt button when contact was empty', async () => {
    await ringUpSaleWithoutContact();

    expect(screen.getByText('No contact info captured — no receipt sent.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send receipt' })).toBeInTheDocument();
  });

  it('opens the resend modal when Send receipt is clicked', async () => {
    await ringUpSaleWithoutContact();

    fireEvent.click(screen.getByRole('button', { name: 'Send receipt' }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/alice@example/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/\+1 555/)).toBeInTheDocument();
    });
  });

  it('blocks submit when both fields are empty', async () => {
    await ringUpSaleWithoutContact();
    fireEvent.click(screen.getByRole('button', { name: 'Send receipt' }));
    const sendBtn = await screen.findByRole('button', { name: 'Send' });
    fireEvent.click(sendBtn);

    await screen.findByText(/at least|al menos/i);
    expect(apiClient.post).not.toHaveBeenCalledWith(expect.stringContaining('/resend-receipt'), expect.anything());
  });

  it('POSTs to resend-receipt with email and updates the card', async () => {
    vi.mocked(apiClient.post).mockImplementation((url: string) => {
      if (url.includes('/resend-receipt')) return Promise.resolve({ data: { success: true, channels: ['email'] } });
      return Promise.resolve({ data: { success: true, saleId: 42 } });
    });

    await ringUpSaleWithoutContact();
    fireEvent.click(screen.getByRole('button', { name: 'Send receipt' }));
    const emailInput = await screen.findByPlaceholderText(/alice@example/i);
    fireEvent.change(emailInput, { target: { value: 'alice@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/sales/42/resend-receipt', { email: 'alice@example.com', phone: null });
    });
    await waitFor(() => {
      expect(screen.getByText('Receipt sent to alice@example.com')).toBeInTheDocument();
    });
  });
```

Note: the helper assumes the existing POS UI has a Charge button discoverable by name regex. If the actual button label is different (e.g. uses an icon-only button), the test will need to use a different selector — inspect with `screen.debug()` if necessary.

- [ ] **Step 2: Run, observe results**

```bash
cd frontend && npx vitest run src/pages/POS.test.tsx
```

Expected outcomes:
- 1 prior smoke test passing.
- 4 new tests: should mostly pass if the UI selectors match, but may need selector tweaks. If a selector fails, use `screen.debug()` inside the test to inspect rendered HTML and adjust the regex.

If selector adjustments are needed, make them — the assertions about API call shape and resulting text are the contract.

- [ ] **Step 3: Once green, run full suite**

```bash
npm test --prefix frontend 2>&1 | tail -3
```
Expected: 34 + 4 = 38 passing.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/POS.test.tsx
git commit -m "test(pos): resend receipt flow tests

Covers the no-contact-info success card, opening the resend modal,
empty-field validation, and the happy-path POST plus card update.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 9: Final verification

- [ ] **Step 1: Build + type check**

```bash
bash scripts/ai-verify.sh 2>&1 | tail -3
```
Expected: clean.

- [ ] **Step 2: Full test suite**

```bash
npm test --prefix backend 2>&1 | tail -3
npm test --prefix frontend 2>&1 | tail -3
```
Expected: 284 backend + 38 frontend = 322 passing.

- [ ] **Step 3: Manual smoke**

```bash
npm run dev
```
1. Log in as `admin` / `devpass`
2. Open `/pos`
3. Add a service to the cart, check out WITHOUT entering email/phone
4. On the success card: confirm "No contact info captured" + "Send receipt" button
5. Click "Send receipt" → enter `test@example.com` → click Send
6. Confirm card flips to "Receipt sent to test@example.com"
7. Click "New transaction"
8. This time enter `test@example.com` before checkout → confirm success card immediately shows "Receipt sent to test@example.com"

- [ ] **Step 4: No additional commit** — every task already committed.

---

## Self-Review

**Spec coverage:**
- ✅ POST `/api/sales/:id/resend-receipt` endpoint — Task 4
- ✅ At-least-one validation — Task 2 + 4
- ✅ 404 on cross-shop access — Task 2
- ✅ Updates `customer_email`/`customer_phone` on resend — Tasks 1, 2
- ✅ Returns `channels` array — Task 2
- ✅ `ResendReceipt` use case — Task 2
- ✅ Sale repo `updateContactInfo` — Task 1
- ✅ ProcessSale wiring of WhatsApp + conversation lookup — Task 3
- ✅ index.ts shared client construction — Task 4
- ✅ POS frontend `successInfo` replacement — Task 6
- ✅ POS resend Modal — Task 7
- ✅ i18n keys — Task 5
- ✅ Frontend behavior tests — Task 8
- ✅ Backend tests for ResendReceipt — Task 2
- ✅ Backend test for ProcessSale wiring — Task 3

**Placeholder scan:** No "TBD", "TODO", or "fill in details". Task 8 acknowledges that the Charge button selector might need tweaking and instructs the engineer to use `screen.debug()` — that's a real "iterate to green" instruction, not a hand-wave.

**Type consistency:**
- `ResendReceiptRequest { saleId, shopId, email, phone }` — used consistently across Tasks 2 (use case) and 4 (route).
- `successInfo: { id, email, phone } | null` — consistent across Tasks 6, 7, 8.
- `ProcessSale` constructor — Task 3 adds optional `convRepo, whatsAppClient` (positions 6, 7); Task 4 invokes `new ProcessSale(saleRepo, customerRepo, barberRepo, productRepo, db, conversationRepo, whatsAppClient)` — matches.
- `ISaleRepository.updateContactInfo(saleId, email, phone)` — defined in Task 1, called in Task 2 — consistent.
- `IConversationRepository.findByPhone(phone)` returns the conversation — verified by exploring the existing repo before writing the plan.
- `IWhatsAppClient` — already exists in the codebase; both `ProcessSale` and `ResendReceipt` accept it as optional.

**Spec amendment carried forward:** The spec said `wa_opt_in + last_inbound_at` come from `findByEmailOrPhone`. The plan corrects this (last_inbound_at is on the conversations table) and adds `IConversationRepository` as a dependency to both use cases.
