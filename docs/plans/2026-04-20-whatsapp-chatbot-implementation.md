# WhatsApp Chatbot Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship Phase 1 (MVP) of the WhatsApp chatbot from `docs/plans/2026-04-19-whatsapp-chatbot-design.md` — customer self-service (book/reschedule/cancel/view-next/FAQ), session-only outbound freeform, two-way Google Calendar mirror.

**Architecture:** Additive Clean Architecture under `backend/src`. New modules: `adapters/whatsapp`, `adapters/llm`, `adapters/google-calendar`, `crypto`, `use-cases/chatbot`, new repositories for conversations/messages/GCal queue. Reuse existing booking use-cases. All external calls behind interfaces; tests use fakes.

**Tech Stack:** TypeScript, Express 5, better-sqlite3, vitest, `twilio`, `ai`, `@ai-sdk/openai`, `zod`, `googleapis`, `node:crypto`, i18next.

---

## Phase 1: Foundation (schema, domain, crypto, repos)

### Task 1.1: Database migrations — tables + columns

**Files:** Modify `backend/src/db.ts` (append before final `export`)

**Step 1: Write failing test**

`backend/src/db.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import db from './db.js';

describe('chatbot schema', () => {
  it('conversations table exists with required columns', () => {
    const cols = db.prepare("PRAGMA table_info(conversations)").all() as Array<{ name: string }>;
    const names = cols.map(c => c.name);
    expect(names).toContain('id');
    expect(names).toContain('customer_id');
    expect(names).toContain('wa_phone');
    expect(names).toContain('language');
    expect(names).toContain('state');
    expect(names).toContain('context_json');
    expect(names).toContain('created_at');
  });

  it('wa_messages table exists', () => {
    const cols = db.prepare("PRAGMA table_info(wa_messages)").all() as Array<{ name: string }>;
    expect(cols.map(c => c.name)).toContain('conversation_id');
    expect(cols.map(c => c.name)).toContain('wa_message_sid');
    expect(cols.map(c => c.name)).toContain('direction');
  });

  it('gcal_pending_ops table exists', () => {
    const cols = db.prepare("PRAGMA table_info(gcal_pending_ops)").all() as Array<{ name: string }>;
    expect(cols.map(c => c.name)).toContain('barber_id');
    expect(cols.map(c => c.name)).toContain('op');
  });

  it('customers has wa_opt_in columns', () => {
    const cols = db.prepare("PRAGMA table_info(customers)").all() as Array<{ name: string }>;
    const names = cols.map(c => c.name);
    expect(names).toContain('wa_opt_in');
    expect(names).toContain('wa_opt_in_at');
    expect(names).toContain('preferred_language');
  });

  it('barbers has gcal columns', () => {
    const cols = db.prepare("PRAGMA table_info(barbers)").all() as Array<{ name: string }>;
    const names = cols.map(c => c.name);
    expect(names).toContain('gcal_refresh_token_enc');
    expect(names).toContain('gcal_calendar_id');
    expect(names).toContain('gcal_channel_id');
    expect(names).toContain('gcal_resource_id');
    expect(names).toContain('gcal_watch_expires_at');
  });

  it('appointments has gcal_event_id', () => {
    const cols = db.prepare("PRAGMA table_info(appointments)").all() as Array<{ name: string }>;
    expect(cols.map(c => c.name)).toContain('gcal_event_id');
  });
});
```

**Step 2: Verify test fails** — `cd backend && npx vitest run src/db.test.ts` → FAIL

**Step 3: Implement migrations**

Append to `backend/src/db.ts` before `export default db;`:

```ts
// Chatbot tables
db.exec(`
  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    wa_phone TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'es',
    state TEXT NOT NULL DEFAULT 'idle',
    context_json TEXT,
    last_inbound_at TEXT,
    last_outbound_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_conversations_phone ON conversations(wa_phone);

  CREATE TABLE IF NOT EXISTS wa_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    direction TEXT NOT NULL CHECK(direction IN ('in','out')),
    wa_message_sid TEXT UNIQUE,
    body TEXT,
    media_url TEXT,
    intent TEXT,
    status TEXT,
    raw_payload_json TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_wa_msgs_conv ON wa_messages(conversation_id, created_at);

  CREATE TABLE IF NOT EXISTS gcal_pending_ops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barber_id INTEGER NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
    appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
    op TEXT NOT NULL CHECK(op IN ('insert','patch','delete')),
    payload_json TEXT NOT NULL,
    attempts INTEGER DEFAULT 0,
    next_attempt_at TEXT,
    last_error TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

try { db.exec("ALTER TABLE customers ADD COLUMN wa_opt_in INTEGER DEFAULT 0"); } catch (e) {}
try { db.exec("ALTER TABLE customers ADD COLUMN wa_opt_in_at TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE customers ADD COLUMN preferred_language TEXT DEFAULT 'es'"); } catch (e) {}
try { db.exec("ALTER TABLE barbers ADD COLUMN gcal_refresh_token_enc TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE barbers ADD COLUMN gcal_calendar_id TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE barbers ADD COLUMN gcal_channel_id TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE barbers ADD COLUMN gcal_resource_id TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE barbers ADD COLUMN gcal_watch_expires_at TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE appointments ADD COLUMN gcal_event_id TEXT"); } catch (e) {}
```

**Step 4: Verify test passes** — `cd backend && npx vitest run src/db.test.ts` → PASS (6 tests)

**Step 5: Commit**

```bash
git add backend/src/db.ts backend/src/db.test.ts
git commit -m "feat(chatbot): add conversations, wa_messages, gcal_pending_ops tables and columns"
```

---

### Task 1.2: Domain entity types

**Files:** Modify `backend/src/domain/entities.ts`

**Step 1: Write failing test**

`backend/src/domain/entities.test.ts`:
```ts
import { describe, it, expectTypeOf } from 'vitest';
import type { Conversation, WaMessage, Intent } from './entities.js';

describe('chatbot domain types', () => {
  it('exports Conversation type', () => {
    const c: Conversation = {
      id: 1, customer_id: 1, wa_phone: '+18095551212',
      language: 'es', state: 'idle', context_json: null,
      last_inbound_at: null, last_outbound_at: null,
      created_at: '2026-04-20T00:00:00', updated_at: '2026-04-20T00:00:00'
    };
    expectTypeOf(c.language).toEqualTypeOf<'es' | 'en'>();
  });

  it('exports Intent type', () => {
    const intents: Intent[] = ['book','reschedule','cancel','view_next','faq','unknown'];
    expectTypeOf(intents).toEqualTypeOf<Intent[]>();
  });

  it('exports WaMessage type', () => {
    const m: WaMessage = {
      id: 1, conversation_id: 1, direction: 'in',
      wa_message_sid: 'SMxxx', body: 'hi', media_url: null,
      intent: null, status: null, raw_payload_json: null,
      created_at: '2026-04-20T00:00:00'
    };
    expectTypeOf(m.direction).toEqualTypeOf<'in' | 'out'>();
  });
});
```

**Step 2: Verify fails** — `cd backend && npx vitest run src/domain/entities.test.ts` → FAIL

**Step 3: Add types**

Append to `backend/src/domain/entities.ts`:
```ts
export type Intent = 'book' | 'reschedule' | 'cancel' | 'view_next' | 'faq' | 'unknown';
export type ConversationState = 'idle' | 'booking' | 'rescheduling' | 'cancelling' | 'faq';

export interface Conversation {
  id: number;
  customer_id: number | null;
  wa_phone: string;
  language: 'es' | 'en';
  state: ConversationState;
  context_json: string | null;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WaMessage {
  id: number;
  conversation_id: number;
  direction: 'in' | 'out';
  wa_message_sid: string | null;
  body: string | null;
  media_url: string | null;
  intent: Intent | null;
  status: string | null;
  raw_payload_json: string | null;
  created_at: string;
}

export interface GCalPendingOp {
  id: number;
  barber_id: number;
  appointment_id: number | null;
  op: 'insert' | 'patch' | 'delete';
  payload_json: string;
  attempts: number;
  next_attempt_at: string | null;
  last_error: string | null;
  created_at: string;
}
```

Re-export from `shared/src/index.ts`.

**Step 4: Verify passes** — `cd backend && npx vitest run src/domain/entities.test.ts` → PASS

**Step 5: Commit**

```bash
git add backend/src/domain/entities.ts backend/src/domain/entities.test.ts shared/src/index.ts
git commit -m "feat(chatbot): add Conversation, WaMessage, Intent domain types"
```

---

### Task 1.3: TokenCipher (AES-256-GCM)

**Files:** Create `backend/src/crypto/token-cipher.ts` + test

**Step 1: Write test**

```ts
import { describe, it, expect } from 'vitest';
import { TokenCipher } from './token-cipher.js';

describe('TokenCipher', () => {
  const key = Buffer.alloc(32, 7).toString('base64');
  const cipher = new TokenCipher(key);

  it('round-trips plaintext', () => {
    const pt = 'ya29.refresh-token';
    const enc = cipher.encrypt(pt);
    expect(cipher.decrypt(enc)).toBe(pt);
  });

  it('produces different ciphertexts for same input', () => {
    const a = cipher.encrypt('same');
    const b = cipher.encrypt('same');
    expect(a).not.toBe(b);
  });

  it('rejects tampered ciphertext', () => {
    const enc = cipher.encrypt('secret');
    const bytes = Buffer.from(enc, 'base64');
    bytes[bytes.length - 1] ^= 0xff;
    expect(() => cipher.decrypt(bytes.toString('base64'))).toThrow();
  });
});
```

**Step 2: Verify fails** — `cd backend && npx vitest run src/crypto/token-cipher.test.ts` → FAIL

**Step 3: Implement**

```ts
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

export class TokenCipher {
  private readonly key: Buffer;

  constructor(keyBase64: string) {
    const key = Buffer.from(keyBase64, 'base64');
    if (key.length !== 32) throw new Error('Key must be 32 bytes');
    this.key = key;
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LEN);
    const cipher = createCipheriv(ALGO, this.key, iv);
    const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, ct]).toString('base64');
  }

  decrypt(packed: string): string {
    const buf = Buffer.from(packed, 'base64');
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const ct = buf.subarray(IV_LEN + TAG_LEN);
    const decipher = createDecipheriv(ALGO, this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
  }
}
```

**Step 4: Verify passes** — `cd backend && npx vitest run src/crypto/token-cipher.test.ts` → PASS

**Step 5: Commit**

```bash
git add backend/src/crypto/token-cipher.ts backend/src/crypto/token-cipher.test.ts
git commit -m "feat(crypto): AES-256-GCM TokenCipher for GCal refresh tokens"
```

---

### Task 1.4: ConversationRepository

**Files:** Create interface + SQLite impl + test

**Interface** (`conversation-repository.interface.ts`):
```ts
export interface IConversationRepository {
  create(c: { wa_phone: string; language: 'es' | 'en'; state: string; customer_id?: number | null }): Promise<number>;
  findById(id: number): Promise<Conversation | null>;
  findByPhone(phone: string): Promise<Conversation | null>;
  updateState(id: number, state: string, context: unknown | null): Promise<void>;
  linkCustomer(id: number, customerId: number): Promise<void>;
  touchInbound(id: number): Promise<void>;
  touchOutbound(id: number): Promise<void>;
}
```

**Impl** (`sqlite-conversation-repository.ts`): Insert/select/update methods using better-sqlite3.

**Test**: Create → findByPhone, update state, touch timestamps, link customer.

**Commit:** `feat(chatbot): ConversationRepository with SQLite impl`

---

### Task 1.5: WaMessageRepository

**Files:** Interface + SQLite impl + test

**Contract:**
```ts
export interface IWaMessageRepository {
  recordInbound(m: { conversation_id: number; wa_message_sid: string | null; body: string | null; media_url: string | null; raw_payload_json: string | null }): Promise<number | null>;
  recordOutbound(m: { conversation_id: number; wa_message_sid: string | null; body: string; status: string }): Promise<number>;
  setIntent(id: number, intent: Intent): Promise<void>;
  findBySid(sid: string): Promise<WaMessage | null>;
  countRecentInbound(phone: string, sinceIso: string): Promise<number>;
}
```

**Key:** `recordInbound` returns null on duplicate SID (UNIQUE constraint).

**Test:** Idempotency, setIntent, count recent.

**Commit:** `feat(chatbot): WaMessageRepository with idempotency`

---

### Task 1.6: GCalPendingOpRepository

**Files:** Interface + SQLite impl + test

**Contract:**
```ts
export interface IGCalPendingOpRepository {
  enqueue(op: { barber_id: number; appointment_id: number | null; op: 'insert' | 'patch' | 'delete'; payload_json: string }): Promise<number>;
  claimDue(now: string, limit: number): Promise<GCalPendingOp[]>;
  markFailed(id: number, error: string, nextAttemptAt: string): Promise<void>;
  delete(id: number): Promise<void>;
}
```

**Test:** Enqueue → claim → mark failed increments attempts.

**Commit:** `feat(chatbot): GCalPendingOpRepository for retry queue`

---

## Phase 2: WhatsApp Adapter

### Task 2.1: Signature Verifier

**Files:** `backend/src/adapters/whatsapp/signature-verifier.ts` + test

```ts
export function verifyTwilioSignature(input: {
  authToken: string;
  signature: string;
  url: string;
  params: Record<string, string>;
}): boolean;
```

Uses `twilio.getExpectedTwilioSignature` in test fixtures.

**Commit:** `feat(wa): Twilio webhook signature verifier`

---

### Task 2.2: Webhook Parser

**Files:** `backend/src/adapters/whatsapp/webhook-parser.ts` + test

```ts
export interface ParsedInbound {
  from: string;
  to: string;
  body: string | null;
  mediaUrl: string | null;
  sid: string;
}
export function parseTwilioInbound(payload: Record<string, string>): ParsedInbound;
```

Normalizes Twilio form payload (strip `whatsapp:` prefix from phone).

**Commit:** `feat(wa): webhook payload parser`

---

### Task 2.3: Language Detector

**Files:** `backend/src/adapters/whatsapp/language-detector.ts` + test

```ts
export function detectLanguage(body: string, previous: 'es' | 'en'): 'es' | 'en';
```

Heuristic: Spanish/English stop-word matching; fallback to previous language.

**Commit:** `feat(wa): language detector ES/EN`

---

### Task 2.4: Twilio WA Client

**Files:** Interface + impl + test

```ts
export interface IWhatsAppClient {
  sendText(to: string, body: string): Promise<{ sid: string | null; status: string }>;
  sendList(to: string, header: string, body: string, buttonText: string, items: Array<{ id: string; title: string }>): Promise<{ sid: string | null; status: string }>;
}
```

Wraps `twilio()` messages API. Tests inject fake Twilio client.

**Commit:** `feat(wa): Twilio WhatsApp client (text + list)`

---

## Phase 3: Inbound Handler & Routing

### Task 3.1: resolve-customer Use-Case

**Files:** Create use-case + test

Looks up customer by phone; creates stub if missing.

**Commit:** `feat(chatbot): resolve-customer use-case`

---

### Task 3.2: shop-context Loader

**Files:** Create + test

Pulls shop name, active services, active barbers from DB.

**Commit:** `feat(chatbot): shop-context loader`

---

### Task 3.3: handle-inbound-message (Phase 3 stub)

**Files:** Use-case + test

Echo-bot version: parses inbound, resolves customer, creates conversation, replies with echo, persists message.

**Commit:** `feat(chatbot): handle-inbound-message skeleton (echo bot)`

---

### Task 3.4: chatbot POST /webhooks/whatsapp

**Files:** `backend/src/routes/chatbot.ts` + test, modify `index.ts`

Route: verify Twilio signature, parse payload, call handler.

**Commit:** `feat(chatbot): POST /webhooks/whatsapp with echo`

---

## Phase 4: LLM Intent Router + FAQ

### Task 4.1: Add dependencies

**Files:** Modify `backend/package.json`

Add: `"ai": "^4.0.0"`, `"@ai-sdk/openai": "^1.0.0"`, `"zod": "^3.23.0"`.

**Commit:** `chore: add ai, @ai-sdk/openai, zod`

---

### Task 4.2: LLM Client

**Files:** Interface + OpenAI impl + test

```ts
export interface ClassifiedIntent {
  intent: Intent;
  args: Record<string, unknown>;
}
export interface ILLMClient {
  classify(systemPrompt: string, userText: string): Promise<ClassifiedIntent>;
  answerFaq(systemPrompt: string, userText: string): Promise<string>;
}
```

Uses Vercel AI SDK + gpt-4o-mini + 5 tools.

**Commit:** `feat(llm): OpenAI client via Vercel AI SDK`

---

### Task 4.3: route-intent Use-Case

**Files:** Create + test

Builds system prompt, calls LLM, returns classified intent.

**Commit:** `feat(chatbot): route-intent with ES/EN prompts`

---

### Task 4.4: FAQ Flow

**Files:** Create + test

```ts
export interface IFlow {
  handle(input: { conversation: Conversation; body: string }): Promise<{ reply: string; nextState: ConversationState; nextContext: unknown | null }>;
}
```

FAQ flow uses LLM to answer; out-of-scope → shop phone fallback.

**Commit:** `feat(chatbot): FAQ flow backed by LLM`

---

### Task 4.5: Wire router into handler

**Files:** Modify `handle-inbound-message.ts`, modify `index.ts`

Replace echo with real intent router + flow dispatch.

**Commit:** `feat(chatbot): wire LLM router + FAQ flow`

---

## Phase 5: Booking Flow (5.1–5.7)

### Task 5.1: List Builders

**Files:** `backend/src/use-cases/chatbot/flows/list-builders.ts` + test

Helper functions: `buildBarberList`, `buildServiceList`, `buildDateList`, `buildSlotList`.

**Commit:** `feat(chatbot): WA list builders for booking`

---

### Task 5.2–5.6: Booking State Machine

Create `backend/src/use-cases/chatbot/flows/book-appointment.ts` implementing 5-step flow: pick barber → service → date → slot → confirm.

Each step: display list, parse selection, advance to next or fail gracefully.

Tests: happy path through 5 steps; selection → createAppointment called.

**Commit:** `feat(chatbot): booking flow steps 1–5`

---

### Task 5.7: Wire booking flow

Modify handler to dispatch intent `book` → booking flow.

End-to-end test: inbound → complete booking → appointment created.

**Commit:** `feat(chatbot): wire booking flow end-to-end`

---

## Phase 6: Reschedule, Cancel, View-Next

### Task 6.1: view-next Flow

Single-shot: show next upcoming appointment or "no appointments" message.

**Commit:** `feat(chatbot): view-next flow`

---

### Task 6.2: cancel Flow

Two steps: list upcoming → confirm delete.

Calls existing `CancelAppointment` use-case.

**Commit:** `feat(chatbot): cancel flow`

---

### Task 6.3: reschedule Flow

Mirrors booking: pick appt → barber → date → slot → confirm.

Calls existing `UpdateAppointment` use-case.

**Commit:** `feat(chatbot): reschedule flow`

---

### Task 6.4: Wire remaining flows

Modify handler to dispatch intents. Add top-level menu on unknown intent.

**Commit:** `feat(chatbot): wire reschedule/cancel/view-next + menu`

---

## Phase 7: Google Calendar Integration (7.1–7.8)

### Task 7.1: Add googleapis dependency

Modify `package.json`, add `GCAL_*` env vars to `.env.example`.

**Commit:** `chore(gcal): add googleapis and env vars`

---

### Task 7.2: OAuth Flow

**Files:** `backend/src/adapters/google-calendar/oauth-flow.ts` + test

```ts
export class GCalOAuthFlow {
  getAuthUrl(state: string): string;
  async exchangeCode(code: string): Promise<{ refreshTokenEnc: string }>;
}
```

Encrypts refresh token via `TokenCipher`.

**Commit:** `feat(gcal): OAuth flow with encrypted tokens`

---

### Task 7.3: GCal Client

**Files:** Interface + impl + test

CRUD events, freebusy query, watch setup.

```ts
export interface IGCalClient {
  freebusy(barberId: number, timeMin: string, timeMax: string): Promise<Array<{ start: string; end: string }>>;
  insertEvent(barberId: number, event: { summary: string; startIso: string; endIso: string }): Promise<string>;
  patchEvent(barberId: number, eventId: string, patch: Partial<{ summary: string }>): Promise<void>;
  deleteEvent(barberId: number, eventId: string): Promise<void>;
  watch(barberId: number, webhookUrl: string): Promise<{ channelId: string; resourceId: string; expiresAt: number }>;
}
```

**Commit:** `feat(gcal): calendar client CRUD + freebusy + watch`

---

### Task 7.4: Integrate with GetAvailableSlots

Modify `backend/src/use-cases/booking/GetAvailableSlots.ts` to accept optional `IGCalClient`; intersect freebusy with DB-derived slots.

**Commit:** `feat(booking): intersect availability with GCal freebusy`

---

### Task 7.5: Write hooks (create/update/cancel)

Modify booking use-cases to call optional `IGCalSync.onAppointmentCreated/Updated/Cancelled` after DB commit.

**Commit:** `refactor(booking): add optional GCalSync hooks`

---

### Task 7.6: GCalSync Adapter

**Files:** `backend/src/adapters/google-calendar/gcal-sync.ts` + test

Try calendar op; on failure, enqueue to `GCalPendingOpRepository`.

**Commit:** `feat(gcal): GCalSync adapter with fallback retry queue`

---

### Task 7.7: Pending-ops Retry Worker

**Files:** `backend/src/scripts/gcal-retry-worker.ts` + test

Periodic: claim due ops, retry, exponential backoff.

**Commit:** `feat(gcal): retry worker for pending calendar ops`

---

### Task 7.8: GCal Push Webhook

**Files:** `backend/src/adapters/google-calendar/webhook-handler.ts` + route + test

Endpoint: `GET /auth/gcal/callback` (OAuth), `POST /webhooks/gcal` (push notifications).

**Commit:** `feat(gcal): push webhook handler + OAuth callback`

---

## Phase 8: Outbound & Opt-In

### Task 8.1: Session-window + repo setters

Helper: `isInSessionWindow(lastInboundAtIso): boolean` (24h from last inbound).

Repo: add `setWaOptIn(customerId, optedIn)`, `setPreferredLanguage`.

**Commit:** `feat(chatbot): session-window helper + opt-in setters`

---

### Task 8.2: Modify communication.ts cascade

Extend `sendAppointmentNotification` + `sendReceipt` to prefer WhatsApp if customer opted in + within session window; otherwise SMS/email.

**Commit:** `feat(chatbot): prefer WhatsApp for notifications`

---

### Task 8.3: Capture implicit opt-in

Modify `resolve-customer` to set `wa_opt_in=1` on first inbound.

**Commit:** `feat(chatbot): implicit wa_opt_in on first inbound`

---

## Phase 9: Hardening & Ops

### Task 9.1: Per-phone rate limit

Modify `POST /webhooks/whatsapp` to check `countRecentInbound(phone, '-1 minute')` >= 30; return 200 if triggered.

**Commit:** `feat(chatbot): per-phone 30 msg/min rate limit`

---

### Task 9.2: 180-day purge cron

Script: `backend/src/scripts/purge-wa-messages.ts`.

Call hourly or daily from `index.ts` interval.

**Commit:** `chore(chatbot): 180-day retention purge`

---

### Task 9.3: GCal watch renewal cron

Script: renew `events.watch` daily (7-day TTL).

**Commit:** `feat(gcal): daily watch renewal cron`

---

### Task 9.4: i18n strings

Add all chatbot keys to `backend/src/locales/es-DO.json` + `en-US.json`.

**Commit:** `feat(chatbot): i18n strings ES/EN`

---

### Task 9.5: Documentation

Create ADR-006, update README, document webhook setup.

**Commit:** `docs: WhatsApp chatbot ADR-006 + operational guide`

---

## Final Checks

1. `cd backend && npm test` → all green
2. `cd backend && npx tsc --noEmit` → no errors
3. Manual smoke: Twilio sandbox → book appt → confirm delivery + DB state
4. Git log: each task = 1 focused commit

---

## Execution

Two paths:

1. **Subagent-Driven (this session)** — dispatch per task, review between tasks. Best for Phase 1–3.
2. **Parallel Session** — new worktree, load plan, `superpowers:executing-plans` for batch execution. Best for Phases 4–7.

Which approach?