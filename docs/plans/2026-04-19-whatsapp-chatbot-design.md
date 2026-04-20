# WhatsApp Chatbot Integration — Design

**Date:** 2026-04-19
**Status:** Design approved, ready for planning.
**Scope:** Phase 1 (MVP) design for a customer-facing WhatsApp chatbot integrated with Barbasys. Reminder templates, shared-inbox handoff, and EN template pack are explicitly deferred.

---

## 1. Goals

Enable two capabilities over WhatsApp Business:

1. **Customer self-service** — book, reschedule, cancel, view next appointment, FAQ.
2. **Outbound notifications** — freeform session replies during active conversations (confirmations, receipts, cancellations) when customer is within the 24h session window.

Bot must integrate cleanly with existing Clean Architecture (ADR-001), reuse booking use-cases (ADR-003), and respect current `i18n` setup (ADR-005).

## 2. Decisions (brainstorm outcomes)

| Topic | Decision |
|---|---|
| Conversation style | Hybrid: WA interactive lists/quick replies for deterministic flows; LLM for intent classification and FAQ answers |
| WhatsApp API provider | Twilio WhatsApp (already in `backend/package.json`) |
| LLM | OpenAI `gpt-4o-mini` via Vercel AI SDK (`ai`, `@ai-sdk/openai`, `zod`) |
| Customer identity | Phone number = identity. Auto-create customer on first inbound. |
| Session state | SQLite (new `conversations`, `wa_messages` tables) |
| Human handoff | None in v1. Unknown intents direct customer to the shop phone. |
| Languages | ES + EN, auto-detected per message |
| Self-service scope v1 | book, reschedule, cancel, view-next, FAQ |
| Booking step order | barber → service → date → slot |
| Google Calendar | Two-way mirror (SQLite is source of truth; GCal mirrored via `events.insert/patch/delete`; freebusy read pre-booking) |
| Outbound v1 | Session-only freeform messages. No Meta-approved templates in v1. |

## 3. Architecture

Module placement follows Clean Architecture as established in ADR-001. New code is additive; existing booking/CRM use-cases are reused, not rewritten.

```
backend/src/
├── domain/
│   └── entities.ts                        # + Conversation, WaMessage, Intent enums
├── repositories/
│   ├── conversation-repository.interface.ts
│   ├── sqlite-conversation-repository.ts
│   └── sqlite-conversation-repository.test.ts
├── use-cases/
│   └── chatbot/
│       ├── handle-inbound-message.ts      # webhook entry use-case
│       ├── route-intent.ts                # LLM-driven intent dispatch
│       ├── resolve-customer.ts            # phone → customer (auto-create)
│       ├── send-message.ts                # outbound orchestration
│       ├── flows/
│       │   ├── book-appointment.ts
│       │   ├── reschedule.ts
│       │   ├── cancel.ts
│       │   ├── view-next.ts
│       │   └── faq.ts
│       └── *.test.ts
├── adapters/
│   ├── whatsapp/
│   │   ├── twilio-wa-client.ts            # send(), interactive lists
│   │   ├── webhook-parser.ts              # Twilio payload → domain msg
│   │   ├── signature-verifier.ts
│   │   └── language-detector.ts           # ES/EN sniff
│   ├── llm/
│   │   ├── openai-client.ts               # Vercel AI SDK wrapper
│   │   └── tools.ts                       # tool() definitions → flows
│   └── google-calendar/
│       ├── gcal-client.ts                 # freebusy, events CRUD
│       ├── oauth-flow.ts                  # authz code → refresh_token
│       └── webhook-handler.ts             # events.watch push
├── crypto/
│   └── token-cipher.ts                    # AES-256-GCM for gcal refresh tokens
└── routes/
    ├── chatbot.ts                          # POST /webhooks/whatsapp
    └── gcal.ts                             # GET/POST /webhooks/gcal, OAuth callback
```

**External surface:**
- `POST /webhooks/whatsapp` — Twilio-signed inbound messages.
- `POST /webhooks/gcal` — Google push notifications.
- `GET /auth/gcal/callback` — OAuth redirect.

**LLM role:** intent classification and FAQ answers only. Booking/reschedule/cancel are deterministic state machines once the intent is chosen. LLM never writes to the DB directly — tool calls return structured arguments; use-cases validate and commit.

## 4. Data Model

New tables:

```sql
CREATE TABLE conversations (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  wa_phone TEXT NOT NULL,              -- normalized E.164
  language TEXT NOT NULL DEFAULT 'es', -- 'es' | 'en'
  state TEXT NOT NULL DEFAULT 'idle',  -- idle|booking|rescheduling|cancelling|faq
  context_json TEXT,                   -- flow slot-filling state
  last_inbound_at TEXT,
  last_outbound_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_conversations_phone ON conversations(wa_phone);

CREATE TABLE wa_messages (
  id INTEGER PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id),
  direction TEXT NOT NULL,              -- 'in' | 'out'
  wa_message_sid TEXT UNIQUE,           -- Twilio SID, idempotency key
  body TEXT,
  media_url TEXT,
  intent TEXT,                          -- classified intent (in only)
  status TEXT,                          -- 'sent'|'failed'|'delivered' (out only)
  raw_payload_json TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_wa_msgs_conv ON wa_messages(conversation_id, created_at);

CREATE TABLE gcal_pending_ops (
  id INTEGER PRIMARY KEY,
  barber_id INTEGER NOT NULL REFERENCES barbers(id),
  appointment_id INTEGER REFERENCES appointments(id),
  op TEXT NOT NULL,                     -- 'insert'|'patch'|'delete'
  payload_json TEXT NOT NULL,
  attempts INTEGER DEFAULT 0,
  next_attempt_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL
);
```

Column additions:

```sql
ALTER TABLE customers ADD COLUMN wa_opt_in INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN wa_opt_in_at TEXT;
ALTER TABLE customers ADD COLUMN preferred_language TEXT DEFAULT 'es';

ALTER TABLE barbers ADD COLUMN gcal_refresh_token_enc TEXT;
ALTER TABLE barbers ADD COLUMN gcal_calendar_id TEXT;
ALTER TABLE barbers ADD COLUMN gcal_channel_id TEXT;
ALTER TABLE barbers ADD COLUMN gcal_resource_id TEXT;
ALTER TABLE barbers ADD COLUMN gcal_watch_expires_at TEXT;

ALTER TABLE appointments ADD COLUMN gcal_event_id TEXT;
```

Domain types: `Conversation`, `WaMessage`, `Intent = 'book'|'reschedule'|'cancel'|'view_next'|'faq'|'unknown'`, `ConversationState` enum.

**Encryption:** `gcal_refresh_token_enc` uses AES-256-GCM keyed by the `GCAL_ENC_KEY` env var (32-byte key). Helper in `crypto/token-cipher.ts`.

## 5. Inbound Flow

```
Twilio payload
  → signature-verifier (reject if invalid → 403)
  → webhook-parser ({from, body, mediaUrl, sid})
  → idempotency check (wa_messages.wa_message_sid UNIQUE)
  → resolve-customer (phone → customer; auto-create stub if new)
  → load/create conversation row (by wa_phone)
  → persist inbound wa_messages row
  → language-detector → update conversation.language
  → dispatch:
       state == 'idle'          → route-intent (Vercel AI SDK)
       state == 'booking'       → flows/book-appointment (continue)
       state == 'rescheduling'  → flows/reschedule (continue)
       state == 'cancelling'    → flows/cancel (continue)
       state == 'faq'           → flows/faq (continue)
  → flow returns {reply, next_state, next_context}
  → persist, send via twilio-wa-client
  → 200 OK (≤5s SLA; above 4s internal cap emits “un momento…” async)
```

**Intent routing** uses `generateText` from the `ai` package with 5 tools; the model classifies synonyms natively (no keyword lists):

```ts
import { generateText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const tools = {
  start_booking: tool({
    description: 'Customer wants a NEW appointment (book, schedule, reserve, cita, turno, agendar).',
    parameters: z.object({
      preferred_barber_name: z.string().optional(),
      preferred_service: z.string().optional(),
      preferred_datetime_hint: z.string().optional(),
    }),
    execute: async (args) => ({ intent: 'book', args }),
  }),
  start_reschedule: tool({ /* ... */ }),
  start_cancel: tool({ /* ... */ }),
  view_next_appointment: tool({ /* ... */ }),
  answer_faq: tool({
    description: 'Customer asks about hours, prices, location, policy.',
    parameters: z.object({ question: z.string() }),
    execute: async ({ question }) => ({ intent: 'faq', question }),
  }),
};

const result = await generateText({
  model: openai('gpt-4o-mini'),
  system: SHOP_SYSTEM_PROMPT,   // prompt-cached, contains shop context
  messages: [{ role: 'user', content: inbound.body }],
  tools,
});
```

If the model returns no tool call or unknown intent, the bot sends a WA list with top-level choices so the customer can pick manually.

## 6. Intent Flows

All flows persist progress in `conversation.context_json` and return `{reply, next_state, next_context}`. State transitions and outbound send are committed atomically.

### 6.1 `book-appointment.ts`

```
step 1: pick_barber   → WA list of barbers
step 2: pick_service  → WA list of services offered by selected barber
step 3: pick_date     → WA list: next 7 days
step 4: pick_slot     → WA list: freebusy-filtered slots
                        (gcal-client.freebusy ∩ existing availability use-case)
step 5: confirm       → yes/no quick reply with summary
step 6: commit
  - use-cases/booking/create-appointment.ts (existing)
  - gcal-client.events.insert → persist gcal_event_id
  - reply confirmation
  - state → idle, clear context
```

Tool-call hints (barber, service, datetime) skip unambiguous steps. Example: *"fade con Juan mañana 3pm"* jumps to step 4.

### 6.2 `reschedule.ts`

```
step 1: pick_appointment → list customer's upcoming appointments
step 2: pick_barber      → default current; allow change
step 3: pick_date + pick_slot (same as booking)
step 4: confirm
step 5: commit
  - existing reschedule use-case
  - gcal-client.events.patch(gcal_event_id)
  - reply
```

### 6.3 `cancel.ts`

```
step 1: pick_appointment
step 2: confirm yes/no
step 3: commit
  - existing cancel use-case
  - gcal-client.events.delete
  - reply
```

### 6.4 `view-next.ts`

Single-shot. Query next upcoming appointment; return formatted reply. No state change.

### 6.5 `faq.ts`

LLM-backed. Context (prompt-cached):

- shop hours, address, phone
- service catalog with prices (DR pesos)
- barber list and specialties
- cancellation policy

System prompt constrains answers to `SHOP_CONTEXT`; out-of-scope replies direct the customer to the shop phone.

## 7. Outbound Flow

**v1 is session-only**: bot sends freeform messages only within the 24h WA session window. No Meta template approvals in v1.

`communication.ts` cascade:

```
sendAppointmentNotification(appt) / sendReceipt(sale):
  if customer.wa_opt_in && within_session_window(customer):
      freeform WA via twilio-wa-client
  else if customer.phone:
      existing Twilio SMS
  else if customer.email:
      existing nodemailer path
```

**Opt-in**: captured implicitly when a customer first messages the bot (Meta policy) or explicitly via a booking-form checkbox for web-initiated customers. Stored in `customers.wa_opt_in` + `wa_opt_in_at`.

**Deferred to phase 2**: approved templates (`appt_reminder_v1`, `appt_confirm_v1`, `receipt_v1`, `otp_v1`), enabling:
- Reminders at T-24h and T-2h
- Confirmations on web-initiated bookings
- Receipts and OTPs sent >24h after last session

## 8. Google Calendar Integration (two-way mirror)

SQLite remains the source of truth. Each barber's "Barbasys" calendar mirrors appointments.

**Auth (per barber):** OAuth 2.0 authorization-code flow.
- Scopes: `https://www.googleapis.com/auth/calendar.events`, `https://www.googleapis.com/auth/calendar.freebusy`.
- UI entry: new button in barber settings ("Conectar Google Calendar").
- Refresh token encrypted and stored in `barbers.gcal_refresh_token_enc`.

**Availability read:** `check-availability` joins existing DB availability with `freebusy.query` so personal blocks (lunch, doctor visits) are respected without UI work.

**Write hooks:**
- `create-appointment` → `events.insert` after DB commit; persist `gcal_event_id` on appointment row.
- `reschedule` → `events.patch(gcal_event_id)`.
- `cancel` → `events.delete(gcal_event_id)`.

**Inbound sync:** `events.watch` registers a webhook (7-day TTL); renewal cron keeps it alive. `POST /webhooks/gcal` notifications trigger a diff; if the barber edits or deletes the event directly, the DB is updated to match.

**Failure handling:** DB commits first, GCal calls retry with exponential backoff; persistent failures enqueue to `gcal_pending_ops` and alert the admin.

## 9. Security

- Env-only secrets: `TWILIO_WA_FROM`, `OPENAI_API_KEY`, `GCAL_CLIENT_ID`, `GCAL_CLIENT_SECRET`, `GCAL_ENC_KEY`, `WA_WEBHOOK_SECRET`. Never logged.
- Mandatory Twilio signature verification on `POST /webhooks/whatsapp`.
- Rate limit per source phone: 30 inbound msgs/min (DoS guard).
- LLM prompts use `SHOP_CONTEXT` only; customer PII stripped from FAQ prompts.
- `wa_messages.body` retention: 180 days, purged by cron.
- AES-256-GCM for GCal refresh tokens; key rotation supported via `GCAL_ENC_KEY_NEXT`.

## 10. Testing

All tests use vitest, matching existing patterns in `backend/src/*.test.ts`. No live API calls in CI; fixtures only.

- `handle-inbound-message.test.ts` — webhook parsing, idempotency, state transitions.
- `route-intent.test.ts` — mocked model responses → correct tool dispatch.
- `flows/*.test.ts` — per flow: happy path, abandoned mid-flow, invalid input, barber-has-no-slots.
- `adapters/whatsapp/twilio-wa-client.test.ts` — send, retry, signature verify.
- `adapters/google-calendar/gcal-client.test.ts` — OAuth, freebusy, events CRUD, token refresh.
- `adapters/google-calendar/webhook-handler.test.ts` — push notification → DB diff.
- `chatbot-journey.test.ts` — integration: full book → confirm → GCal event created (stubbed Twilio + OpenAI + GCal).

## 11. Error Handling Summary

| Failure | Behavior |
|---|---|
| Twilio signature invalid | 403 |
| Poison payload | Log + 200 (avoid retries) |
| Flow exception | Catch, reply apology, state → idle |
| LLM timeout/error (>4s) | Fallback to top-level WA list (manual pick) |
| GCal down | DB commits; enqueue `gcal_pending_ops`; worker retries |
| Twilio send 5xx | 3× exponential backoff; log failure |
| Duplicate webhook | Unique constraint on `wa_message_sid` → no-op |

## 12. Dependencies

Add to `backend/package.json`:

```json
{
  "ai": "^4.x",
  "@ai-sdk/openai": "^1.x",
  "zod": "^3.x",
  "googleapis": "^140.x"
}
```

## 13. Phasing

| Phase | Scope | Estimate |
|---|---|---|
| P1 — Foundation | tables, webhook, Twilio WA send, resolve-customer, echo bot | 1 week |
| P2 — LLM routing | Vercel AI SDK, 5 tools, FAQ flow with shop context | 3–5 days |
| P3 — Booking flow | book-appointment state machine, WA lists | 1 week |
| P4 — Other flows | reschedule, cancel, view-next | 4–5 days |
| P5 — GCal adapter | OAuth, freebusy, events CRUD, watch webhook | 1 week |
| P6 — Hardening | retries, pending-ops queue, 180d purge cron, rate limits | 3 days |
| Phase 2 (post-MVP) | Meta templates, WA reminders, EN template pack, analytics | — |

## 14. Operational Notes

- New env vars documented in `.env.example`.
- Twilio WA webhook URL configured post-deploy; Caddy already terminates TLS.
- GCal push webhook requires public HTTPS (`/webhooks/gcal`); renewal cron keeps `events.watch` alive (max 7-day TTL).
- `reminder-cron.ts` remains on existing SMS path in v1.
