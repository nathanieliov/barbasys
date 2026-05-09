# Verification Strategy — Critical-Path E2E + Integration Tier

**Date:** 2026-05-08
**Status:** Approved (awaiting implementation plan)
**Owner:** nathanieliov

## Problem

The repository has ~50 backend unit/repository tests and 6 frontend smoke tests, but:

- `scripts/ai-verify.sh` only runs build + type-check — no test execution.
- There are zero end-to-end tests covering user journeys through the browser.
- There are zero HTTP-level integration tests of Express routes (existing tests stop at the use-case layer).
- Critical revenue surfaces (booking, POS, WhatsApp chatbot) have no flow-level coverage.

The goal is **flow-level confidence that key user journeys work end-to-end**, plus a single command (`npm run verify`) that exercises every tier and fails loudly on regressions.

## Approach

**Critical-path E2E + a thin integration tier**, not a full pyramid. We tier by risk: revenue-critical journeys get E2E; server-only or auth-boundary surfaces get HTTP integration tests; everything else continues to rely on the existing unit layer.

**Total scope: 20 new tests** (13 E2E + 7 integration) plus tooling and `ai-verify.sh` upgrades.

### Non-goals

The following are **explicitly out of scope** and require separate specs if pursued:

- CI YAML hookup (GitHub Actions) — one-page follow-up after `npm run verify` works locally.
- Cross-browser testing (Firefox, Safari, mobile viewports). Chromium only.
- Visual regression testing.
- Performance / load testing.
- Accessibility automation (axe-core).
- Parallel E2E workers (`workers: 1` until flake budget is established).
- Mutation testing.
- Google Calendar OAuth E2E (requires real Google account; remains unit-tested at the adapter).
- Real Twilio sandbox usage. All WhatsApp surfaces use `FakeTwilioClient`.

---

## Architecture

### Three test tiers, three locations, three runners

```
barbasys/
├── backend/src/**/*.test.ts         ← existing unit tests (vitest, no change)
├── frontend/src/**/*.test.tsx       ← existing component/smoke tests (vitest, no change)
├── backend/test/integration/        ← NEW — supertest + vitest, in-memory DB
│   ├── chatbot-book.test.ts
│   ├── chatbot-cancel.test.ts
│   ├── chatbot-reschedule.test.ts
│   ├── chatbot-unknown.test.ts
│   ├── auth-login-wrong-password.test.ts
│   ├── auth-login-rate-limit.test.ts
│   └── public-shop-settings.test.ts
└── e2e/                             ← NEW — Playwright, real built artifacts
    ├── playwright.config.ts
    ├── fixtures/seed-test.ts        ← deterministic seed (separate from demo:setup)
    ├── fixtures/auth.ts             ← per-role storage-state helpers
    ├── auth/                        ← 4 tests
    ├── booking/                     ← 2 tests
    ├── appointments/                ← 2 tests
    ├── pos/                         ← 2 tests
    ├── catalog/                     ← 1 test
    ├── reports/                     ← 1 test
    └── multi-shop/                  ← 1 test
```

### Tooling

- **Playwright** (`@playwright/test`) at root devDependencies. Chromium only. Built-in `webServer` config spins up `npm run start --prefix backend` and `npm run preview --prefix frontend`.
- **Supertest + vitest** for integration. Both already installed. Tests import the Express `app` directly and run against `:memory:` SQLite via the existing `NODE_ENV=test` path.
- **Mocking strategy:** External adapters (`TwilioWhatsAppClient`, OpenAI `LLMClient`, `GCalClient`) get fakes wired through dependency injection at the composition root in `backend/src/index.ts`. No HTTP-level mocking like `nock`. This matches the existing hexagonal architecture.

### Test data

E2E uses a file-based test DB at `data/test.db` (the browser-driven backend is a separate Node process and cannot share `:memory:` with the Playwright runner). Wiped + reseeded once per `npm run test:e2e` invocation via `e2e/fixtures/seed-test.ts` (Playwright `globalSetup`).

Integration tests use `:memory:` per file via the existing test-mode db.ts path.

### Seed dataset (`e2e/fixtures/seed-test.ts`)

Deterministic, idempotent. Reuses existing repository classes — no raw SQL.

```
Shop A: "Barbería Test" (id: shop-test-1)
  Settings: timezone=America/Santo_Domingo, default locale=es-DO

Users:
  OWNER:    owner@test.local       / TestPass123!
  MANAGER:  manager@test.local     / TestPass123!
  BARBER:   ramon@test.local       / TestPass123!  (linked to barber-ramon)
  CUSTOMER: customer@test.local    / TestPass123!  (phone: +18095550100)

Barbers:
  barber-ramon  (active, 9am-5pm Mon-Fri shifts for next 7 days)
  barber-luis   (active, fully booked on day 0 — exercises "no slots" UX)

Services:
  svc-haircut   ($25, 30 min)
  svc-beard     ($15, 20 min)
  svc-combo     ($35, 45 min)

Products:
  prod-pomade   ($12, stock=10)
  prod-shampoo  ($18, stock=2)   ← below low-stock threshold

Shop B: "Barbería Test 2" (id: shop-test-2)
  OWNER above is also owner of Shop B → exercises multi-shop switching
```

### Auth fixture (`e2e/fixtures/auth.ts`)

Playwright fixture exposing per-role authenticated browser contexts. Logs in once per worker via `POST /api/auth/login`, stores JWT in `localStorage`, reuses the storage state across tests in that worker. The login flow itself is exercised end-to-end exactly once via E2E-01; everywhere else uses the fast path:

```ts
test.use({ storageState: 'e2e/.auth/owner.json' });
```

### Run isolation

- **E2E:** `data/test.db` wiped + reseeded once per `npm run test:e2e`. Tests run **serially** (`workers: 1`) — accept slower runs (~3-5 min for 13 tests) over flakiness from shared-DB races. Parallelization deferred.
- **Integration:** each `*.test.ts` file gets a fresh `:memory:` DB inside `beforeEach`. No cross-file state.

### Required code changes outside of tests

1. **`backend/src/db.ts`** — accept `DB_PATH` env var (currently hard-codes `data/barbasys.db` outside test mode).
2. **`backend/src/index.ts`** — accept injected adapter fakes via env when `NODE_ENV=test`:
   - `FAKE_TWILIO=1` → wires `FakeTwilioClient` (in-memory message recorder)
   - `FAKE_LLM=1` → wires `FakeLLMClient` (returns scripted intents)
   - Follows the existing composition-root pattern. ~15 lines.
3. **OTP / reset-password dev seam** — `OTP_DEV_BYPASS` exists for OTP; confirm it covers reset-password tokens (E2E-04 needs to read the most recent token for a user). Extend if not.

---

## Test inventory

### E2E — Authentication (4)

| ID | Journey | Key assertions |
|---|---|---|
| E2E-01 | Owner login → Dashboard | Redirect to `/`, sidebar shows admin items, greeting visible |
| E2E-02 | Barber login → My Schedule | Redirect to `/my-schedule` (NOT Dashboard), admin items hidden, today's shift visible |
| E2E-03 | Customer signup → Customer Portal | Redirect to `/portal`, "My Bookings" empty state visible |
| E2E-04 | Forgot password → reset → re-login | Reset succeeds, new password works, old password fails |

### E2E — Public booking (5-step flow) (2)

| ID | Journey | Key assertions |
|---|---|---|
| E2E-05 | Guest books via OTP, specific barber | 5 steps complete, OTP verified (dev bypass), confirmation shows id/date/time/barber and "Get directions" link |
| E2E-06 | Guest books with "Any" barber | Confirmation shows actual barber name (not "Any"); appointment row exists in DB via API |

### E2E — Admin appointments (2)

| ID | Journey | Key assertions |
|---|---|---|
| E2E-07 | OWNER creates appointment from Schedule | Appointment block appears in calendar; `GET /api/appointments` includes new id |
| E2E-08 | OWNER cancels appointment, slot frees | Status badge becomes "Cancelled"; `/api/public/barbers/:id/availability` shows slot available |

### E2E — POS (2)

| ID | Journey | Key assertions |
|---|---|---|
| E2E-09 | Walk-in sale (no customer) | Receipt shows total $37.00, sale id present, FakeTwilio recorded zero messages |
| E2E-10 | Customer sale with WhatsApp receipt | Receipt status "Sent", FakeTwilio recorded one message to `whatsapp:+18095550100` containing sale id |

### E2E — Catalog (1)

| ID | Journey | Key assertions |
|---|---|---|
| E2E-11 | OWNER creates service → service appears in booking flow | "Test Trim" service is selectable in `/book/barberia-test` after creation |

### E2E — Reports (1)

| ID | Journey | Key assertions |
|---|---|---|
| E2E-12 | OWNER views commissions report | Ramon's commission row matches `sale_total × commission_rate` within $0.01 |

### E2E — Multi-shop (1)

| ID | Journey | Key assertions |
|---|---|---|
| E2E-13 | OWNER switches shop, data scopes correctly | Schedule shows shop-test-2 appointments only; `/api/auth/me` reports `shop_id: shop-test-2` |

### Integration — Chatbot (4)

All against `POST /api/chatbot/webhooks/whatsapp` with `From=whatsapp:+18095550100`. `FakeLLMClient` is configured per-test to return scripted intent + slots.

| ID | Trigger | Key assertions |
|---|---|---|
| INT-01 | `book` intent | 200 response, new appointment row, FakeTwilio recorded confirmation reply |
| INT-02 | `cancel` intent (against pre-inserted appointment) | Appointment status = `cancelled`, confirmation sent |
| INT-03 | `reschedule` intent | Appointment `start_at` updated, old slot becomes available |
| INT-04 | `unknown` intent | FakeTwilio received configured fallback i18n string, no DB writes |

### Integration — Auth boundaries (3)

| ID | Trigger | Key assertions |
|---|---|---|
| INT-05 | `POST /api/auth/login` with bad password | 401, no token, no leak of `password_hash` shape |
| INT-06 | Hammer `/api/auth/login` from same IP | After threshold, responses become 429 |
| INT-07 | `GET /api/public/shops/:id` unauthenticated | 200, body includes `settings.timezone`, `settings.default_locale` |

---

## `ai-verify.sh` upgrade

```bash
#!/bin/bash
# Usage: bash scripts/ai-verify.sh         # full: type + unit + integration + E2E
#        bash scripts/ai-verify.sh --quick # skip E2E (~30s)
set -e

QUICK=false
[[ "$1" == "--quick" ]] && QUICK=true

# Stage 1: Clean
rm -rf backend/dist frontend/dist shared/dist

# Stage 2: Shared contracts (must come first)
npm run build:shared

# Stage 3: Type checks
npm run build:backend
npm run build:frontend

# Stage 4: Unit tests (vitest, both packages)
npm test --prefix backend
npm test --prefix frontend

# Stage 5: Integration tests (supertest, in-memory DB)
npm run test:integration --prefix backend

# Stage 6: E2E (Playwright, real built artifacts)
if [[ "$QUICK" == "false" ]]; then
  npm run test:e2e
fi

echo "✅ Verification passed"
```

### New npm scripts

```jsonc
// root package.json
"scripts": {
  "test:integration": "npm run test:integration --prefix backend",
  "test:e2e": "playwright test --config=e2e/playwright.config.ts",
  "test:e2e:ui": "playwright test --config=e2e/playwright.config.ts --ui",
  "verify": "bash scripts/ai-verify.sh",
  "verify:quick": "bash scripts/ai-verify.sh --quick"
}

// backend/package.json
"scripts": {
  "test": "vitest run --exclude 'test/integration/**'",
  "test:integration": "vitest run test/integration"
}
```

### Playwright config (key parts)

```ts
// e2e/playwright.config.ts
webServer: [
  { command: 'npm run start --prefix backend',
    port: 3000,
    env: { NODE_ENV: 'test', DB_PATH: 'data/test.db', FAKE_TWILIO: '1', FAKE_LLM: '1', OTP_DEV_BYPASS: '1' } },
  { command: 'npm run preview --prefix frontend', port: 4173 },
],
use: { baseURL: 'http://localhost:4173' },
workers: 1,
globalSetup: './fixtures/seed-test.ts',
```

### Verification matrix

| Trigger | Command | Expected time | Catches |
|---|---|---|---|
| Mid-edit, save | `npm run verify:quick` | ~30s | Type errors, unit + integration regressions |
| Before commit | `npm run verify` | ~3-5 min | Above + flow regressions (E2E) |
| Single E2E debug | `npm run test:e2e:ui` | interactive | Develop a single failing test |
| CI (future) | `npm run verify` | ~5 min | Same as before-commit, on every PR |

---

## Phased rollout

Each phase ends with `npm run verify` green. Each phase is a mergeable PR.

### Phase 1 · Plumbing & seams (~½ day)

- Add `@playwright/test` to root devDependencies; `npx playwright install chromium`
- Patch `backend/src/db.ts`: read `DB_PATH` env (default `data/barbasys.db`)
- Add `FAKE_TWILIO` and `FAKE_LLM` env hooks in `backend/src/index.ts` composition root
- Implement `backend/src/adapters/whatsapp/fake-twilio-client.ts` (~30 lines)
- Implement `backend/src/adapters/llm/fake-llm-client.ts` (~30 lines)
- Verify `OTP_DEV_BYPASS` covers reset-password tokens; extend if not
- Scaffold `e2e/playwright.config.ts`, `e2e/fixtures/seed-test.ts`, `e2e/fixtures/auth.ts`
- Scaffold `backend/test/integration/` directory
- Update root + backend `package.json` scripts and `scripts/ai-verify.sh`

**Exit criteria:** `npm run verify:quick` passes (no behavior change); `npm run test:e2e` runs and reports "0 tests" cleanly.

### Phase 2 · Five highest-leverage E2E (~1.5 days)

- E2E-01 (owner login) — also validates auth fixture infrastructure
- E2E-05 (guest 5-step booking)
- E2E-09 (walk-in POS sale)
- E2E-07 (owner creates appointment)
- E2E-13 (multi-shop switch)

**Exit criteria:** these five run reliably 10× in a row locally; `TESTING.md` documents the seed dataset and how to add an E2E test.

### Phase 3 · Remaining 8 E2E (~2 days)

- E2E-02, 03, 04 (auth: barber, signup, forgot/reset)
- E2E-06 (Any barber)
- E2E-08 (cancel appointment)
- E2E-10 (customer sale + WhatsApp receipt)
- E2E-11 (catalog → booking)
- E2E-12 (commissions math)

**Exit criteria:** all 13 E2E green serially in `npm run verify`.

### Phase 4 · Integration tier (~1 day)

- INT-01..04 (chatbot intents via FakeLLM stub)
- INT-05..07 (auth boundaries)

**Exit criteria:** `npm run test:integration` green; `npm run verify` runs all three tiers.

### Phase 5 · Documentation & polish (~½ day)

- `TESTING.md` at repo root: verification matrix, "how to add a test" walkthrough, seed dataset reference, troubleshooting
- ADR documenting the test architecture decisions (`bash scripts/new-adr.sh "Verification strategy"`)
- README section pointing at `npm run verify`

---

## Total estimate

**~5½ days of focused work, 5 mergeable PRs.** Each phase is independently shippable. If work pauses after Phase 2, the project still has meaningful coverage of the most critical revenue paths.

## Success criteria

- `npm run verify` runs and passes locally on a clean checkout in under 6 minutes.
- Every flow listed in the test inventory has a green test.
- An engineer can introduce a regression in any covered flow and `npm run verify` will fail.
- New team members can read `TESTING.md` and add an E2E test for a new flow without asking.
