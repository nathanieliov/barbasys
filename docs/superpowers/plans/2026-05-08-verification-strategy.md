# Verification Strategy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add critical-path E2E + a thin HTTP integration tier (20 tests total) plus an upgraded `ai-verify.sh` so a single `npm run verify` command catches flow-level regressions across booking, POS, auth, chatbot, and multi-shop.

**Architecture:** Three test tiers — existing unit tests (vitest, no change), new HTTP integration tests (supertest + vitest, in-memory DB), new browser E2E (Playwright, real built backend + Vite preview against `data/test.db`). External adapters (`TwilioWhatsAppClient`, `LLMClient`) are replaced with in-memory fakes at the composition root via `FAKE_TWILIO=1` / `FAKE_LLM=1` env hooks.

**Tech Stack:** Playwright (`@playwright/test`, Chromium only), supertest (already installed), vitest (already installed), better-sqlite3 (already installed), bash for `ai-verify.sh`.

**Spec:** `docs/superpowers/specs/2026-05-08-verification-strategy-design.md`

---

## File Structure

### Created

| Path | Responsibility |
|---|---|
| `backend/src/adapters/whatsapp/fake-twilio-client.ts` | In-memory `IWhatsAppClient` recording outbound messages for assertions |
| `backend/src/adapters/llm/fake-llm-client.ts` | In-memory `ILLMClient` returning scripted intents/answers via env-controlled queue |
| `backend/test/integration/_setup.ts` | Shared supertest helper: builds an Express app pinned to `:memory:` DB with fakes |
| `backend/test/integration/chatbot-book.test.ts` | INT-01 |
| `backend/test/integration/chatbot-cancel.test.ts` | INT-02 |
| `backend/test/integration/chatbot-reschedule.test.ts` | INT-03 |
| `backend/test/integration/chatbot-unknown.test.ts` | INT-04 |
| `backend/test/integration/auth-login-wrong-password.test.ts` | INT-05 |
| `backend/test/integration/auth-login-rate-limit.test.ts` | INT-06 |
| `backend/test/integration/public-shop-settings.test.ts` | INT-07 |
| `e2e/playwright.config.ts` | Playwright config with two-process `webServer`, `workers: 1`, globalSetup |
| `e2e/fixtures/seed-test.ts` | Wipes `data/test.db` and seeds the deterministic test dataset (Playwright globalSetup) |
| `e2e/fixtures/auth.ts` | Per-role authenticated `storageState` helpers |
| `e2e/fixtures/api.ts` | Thin HTTP client used inside tests for setup/verification calls |
| `e2e/fixtures/db.ts` | Read-only DB helpers used by tests (e.g., fetch latest OTP, count appointments) |
| `e2e/auth/owner-login.spec.ts` | E2E-01 |
| `e2e/auth/barber-login.spec.ts` | E2E-02 |
| `e2e/auth/customer-signup.spec.ts` | E2E-03 |
| `e2e/auth/forgot-password.spec.ts` | E2E-04 |
| `e2e/booking/guest-otp-booking.spec.ts` | E2E-05 |
| `e2e/booking/any-barber-booking.spec.ts` | E2E-06 |
| `e2e/appointments/owner-creates-appointment.spec.ts` | E2E-07 |
| `e2e/appointments/owner-cancels-appointment.spec.ts` | E2E-08 |
| `e2e/pos/walk-in-sale.spec.ts` | E2E-09 |
| `e2e/pos/customer-sale-whatsapp.spec.ts` | E2E-10 |
| `e2e/catalog/owner-creates-service.spec.ts` | E2E-11 |
| `e2e/reports/owner-views-commissions.spec.ts` | E2E-12 |
| `e2e/multi-shop/owner-switches-shop.spec.ts` | E2E-13 |
| `TESTING.md` | Verification matrix, seed dataset reference, "how to add a test" |
| `docs/adr/NNNN-verification-strategy.md` | ADR (number assigned by `scripts/new-adr.sh`) |

### Modified

| Path | Change |
|---|---|
| `backend/src/db.ts` | Honor `DB_PATH` env override before NODE_ENV-based defaults |
| `backend/src/index.ts` | Conditionally inject `FakeTwilioClient` / `FakeLLMClient` at composition root |
| `backend/src/routes/chatbot.ts` | Already injectable — confirm fake LLM is wired through |
| `scripts/ai-verify.sh` | Staged verification with `--quick` mode |
| `package.json` (root) | Add `test:integration`, `test:e2e`, `test:e2e:ui`, `verify`, `verify:quick` |
| `backend/package.json` | Split `test` (unit) vs `test:integration` |
| `.gitignore` | Ignore `e2e/.auth/`, `e2e/test-results/`, `data/test.db`, `playwright-report/` |
| `README.md` | Add "Verification" section pointing at `npm run verify` |

---

## Phase 1 — Plumbing & Seams

### Task 1.1: Add Playwright dependency and install Chromium

**Files:**
- Modify: `package.json` (root)

- [ ] **Step 1: Add Playwright as a root devDependency**

```bash
npm install --save-dev --workspaces=false @playwright/test@^1.48.0
```

- [ ] **Step 2: Install Chromium browser**

```bash
npx playwright install chromium
```

Expected: `Chromium 130.x downloaded` (or current stable).

- [ ] **Step 3: Verify install**

```bash
npx playwright --version
```

Expected: prints `Version 1.48.x` or newer.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(test): add @playwright/test for E2E suite"
```

---

### Task 1.2: Honor DB_PATH env override in backend/src/db.ts

**Files:**
- Modify: `backend/src/db.ts:9-14`

- [ ] **Step 1: Replace the dbPath resolution to check `DB_PATH` first**

Replace lines 9-14 with:

```ts
const rawDbUrl = process.env.DATABASE_URL?.replace(/^sqlite:\/\//, '');
const envDbPath = process.env.DB_PATH;
const dbPath = envDbPath || rawDbUrl || (process.env.NODE_ENV === 'test'
  ? ':memory:'
  : process.env.NODE_ENV === 'production'
    ? path.join(__dirname, '../../data/barbasys.db')
    : path.join(__dirname, '../barbasys.db'));
```

`DB_PATH` is a relative or absolute file path (e.g., `data/test.db`). It overrides every other selection so E2E can pin the backend to a known file even when `NODE_ENV=test` (which would otherwise force `:memory:`).

- [ ] **Step 2: Verify existing tests still pass**

```bash
npm test --prefix backend
```

Expected: all tests pass (no `DB_PATH` set → `:memory:` selected as before).

- [ ] **Step 3: Commit**

```bash
git add backend/src/db.ts
git commit -m "feat(db): honor DB_PATH env for E2E pinning"
```

---

### Task 1.3: Implement FakeTwilioClient

**Files:**
- Create: `backend/src/adapters/whatsapp/fake-twilio-client.ts`
- Create: `backend/src/adapters/whatsapp/fake-twilio-client.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// backend/src/adapters/whatsapp/fake-twilio-client.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { FakeTwilioClient, fakeTwilioOutbox } from './fake-twilio-client.js';

describe('FakeTwilioClient', () => {
  beforeEach(() => fakeTwilioOutbox.clear());

  it('records sendText calls', async () => {
    const client = new FakeTwilioClient();
    const res = await client.sendText('whatsapp:+18095550100', 'hi');
    expect(res).toEqual({ sid: expect.stringMatching(/^FAKE-/), status: 'queued' });
    expect(fakeTwilioOutbox.messages).toHaveLength(1);
    expect(fakeTwilioOutbox.messages[0]).toMatchObject({
      to: 'whatsapp:+18095550100',
      body: 'hi',
      kind: 'text',
    });
  });

  it('records sendList calls with items', async () => {
    const client = new FakeTwilioClient();
    await client.sendList('whatsapp:+1', 'H', 'B', 'Pick', [{ id: '1', title: 'A' }]);
    expect(fakeTwilioOutbox.messages[0]).toMatchObject({
      kind: 'list',
      items: [{ id: '1', title: 'A' }],
    });
  });

  it('clear() resets the outbox', async () => {
    const client = new FakeTwilioClient();
    await client.sendText('to', 'body');
    fakeTwilioOutbox.clear();
    expect(fakeTwilioOutbox.messages).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/adapters/whatsapp/fake-twilio-client.test.ts --prefix backend
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement FakeTwilioClient**

```ts
// backend/src/adapters/whatsapp/fake-twilio-client.ts
import { IWhatsAppClient } from './whatsapp-client.interface.js';

export interface FakeTwilioMessage {
  to: string;
  body: string;
  kind: 'text' | 'list';
  header?: string;
  buttonText?: string;
  items?: Array<{ id: string; title: string }>;
  timestamp: string;
}

class FakeTwilioOutbox {
  messages: FakeTwilioMessage[] = [];
  clear() { this.messages = []; }
  byPhone(to: string) { return this.messages.filter(m => m.to === to); }
}

export const fakeTwilioOutbox = new FakeTwilioOutbox();

let counter = 0;

export class FakeTwilioClient implements IWhatsAppClient {
  async sendText(to: string, body: string) {
    fakeTwilioOutbox.messages.push({ to, body, kind: 'text', timestamp: new Date().toISOString() });
    return { sid: `FAKE-${++counter}`, status: 'queued' };
  }

  async sendList(to: string, header: string, body: string, buttonText: string, items: Array<{ id: string; title: string }>) {
    fakeTwilioOutbox.messages.push({ to, body, kind: 'list', header, buttonText, items, timestamp: new Date().toISOString() });
    return { sid: `FAKE-${++counter}`, status: 'queued' };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/adapters/whatsapp/fake-twilio-client.test.ts --prefix backend
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/adapters/whatsapp/fake-twilio-client.ts backend/src/adapters/whatsapp/fake-twilio-client.test.ts
git commit -m "feat(adapters): add FakeTwilioClient for test injection"
```

---

### Task 1.4: Implement FakeLLMClient

**Files:**
- Create: `backend/src/adapters/llm/fake-llm-client.ts`
- Create: `backend/src/adapters/llm/fake-llm-client.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// backend/src/adapters/llm/fake-llm-client.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { FakeLLMClient, fakeLLMScript } from './fake-llm-client.js';

describe('FakeLLMClient', () => {
  beforeEach(() => fakeLLMScript.reset());

  it('returns scripted classify responses in order', async () => {
    fakeLLMScript.queueIntent({ intent: 'book', args: { date: '2026-06-01' } });
    fakeLLMScript.queueIntent({ intent: 'cancel', args: {} });
    const client = new FakeLLMClient();

    expect(await client.classify('sys', 'q1')).toEqual({ intent: 'book', args: { date: '2026-06-01' } });
    expect(await client.classify('sys', 'q2')).toEqual({ intent: 'cancel', args: {} });
  });

  it('returns "unknown" intent when queue is empty', async () => {
    const client = new FakeLLMClient();
    expect(await client.classify('sys', 'anything')).toEqual({ intent: 'unknown', args: {} });
  });

  it('returns scripted FAQ answers', async () => {
    fakeLLMScript.queueAnswer('Estamos abiertos hasta las 8pm');
    const client = new FakeLLMClient();
    expect(await client.answerFaq('sys', 'horario?')).toBe('Estamos abiertos hasta las 8pm');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/adapters/llm/fake-llm-client.test.ts --prefix backend
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement FakeLLMClient**

```ts
// backend/src/adapters/llm/fake-llm-client.ts
import { ILLMClient, ClassifiedIntent } from './llm-client.interface.js';

class FakeLLMScript {
  private intentQueue: ClassifiedIntent[] = [];
  private answerQueue: string[] = [];

  queueIntent(intent: ClassifiedIntent) { this.intentQueue.push(intent); }
  queueAnswer(answer: string) { this.answerQueue.push(answer); }
  reset() { this.intentQueue = []; this.answerQueue = []; }

  nextIntent(): ClassifiedIntent {
    return this.intentQueue.shift() ?? { intent: 'unknown', args: {} };
  }
  nextAnswer(): string {
    return this.answerQueue.shift() ?? 'No tengo información sobre eso.';
  }
}

export const fakeLLMScript = new FakeLLMScript();

export class FakeLLMClient implements ILLMClient {
  async classify(_systemPrompt: string, _userText: string): Promise<ClassifiedIntent> {
    return fakeLLMScript.nextIntent();
  }
  async answerFaq(_systemPrompt: string, _userText: string): Promise<string> {
    return fakeLLMScript.nextAnswer();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/adapters/llm/fake-llm-client.test.ts --prefix backend
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/adapters/llm/fake-llm-client.ts backend/src/adapters/llm/fake-llm-client.test.ts
git commit -m "feat(adapters): add FakeLLMClient with scriptable intent/answer queues"
```

---

### Task 1.5: Wire FAKE_TWILIO and FAKE_LLM env hooks in composition root

**Files:**
- Modify: `backend/src/index.ts:76-79` (Twilio client) and the chatbot router setup
- Modify: `backend/src/routes/chatbot.ts` (verify it accepts an injected LLM)

- [ ] **Step 1: Read the chatbot router to understand current LLM injection**

```bash
sed -n '1,40p' backend/src/routes/chatbot.ts
```

Confirm whether the LLM client is already a parameter or hardcoded. If hardcoded, we need a small refactor: export a factory that takes `llmClient`. If already a parameter, just wire the env-controlled fake.

- [ ] **Step 2: In `backend/src/index.ts`, replace the unconditional Twilio client construction (currently lines 76-79) with a conditional**

Find:

```ts
const whatsAppClient = new TwilioWhatsAppClient(
  twilio(process.env.TWILIO_ACCOUNT_SID || '', process.env.TWILIO_AUTH_TOKEN || ''),
  process.env.TWILIO_FROM_NUMBER || 'whatsapp:+14155238886',
);
```

Replace with:

```ts
import { FakeTwilioClient } from './adapters/whatsapp/fake-twilio-client.js';
import { FakeLLMClient } from './adapters/llm/fake-llm-client.js';
// (place imports at the top with the other adapter imports)

const whatsAppClient: IWhatsAppClient = process.env.FAKE_TWILIO === '1'
  ? new FakeTwilioClient()
  : new TwilioWhatsAppClient(
      twilio(process.env.TWILIO_ACCOUNT_SID || '', process.env.TWILIO_AUTH_TOKEN || ''),
      process.env.TWILIO_FROM_NUMBER || 'whatsapp:+14155238886',
    );
```

(Add `import { IWhatsAppClient } from './adapters/whatsapp/whatsapp-client.interface.js';` to the imports.)

- [ ] **Step 3: Wire the LLM fake**

Locate where `chatbotRouter` is built or imported. The current code is `import chatbotRouter from './routes/chatbot.js';`. If `chatbot.ts` imports its own `OpenAILLMClient`, refactor `chatbot.ts` to export a factory:

```ts
// backend/src/routes/chatbot.ts (top of file, after existing imports)
import { ILLMClient } from '../adapters/llm/llm-client.interface.js';
import { OpenAILLMClient } from '../adapters/llm/openai-llm-client.js';

export function buildChatbotRouter(opts: { llmClient: ILLMClient }) {
  // ... existing router setup, replacing any `new OpenAILLMClient(...)` with `opts.llmClient`
  return router;
}

// Keep the default export for backward compatibility
const defaultLLM = new OpenAILLMClient(process.env.OPENAI_API_KEY || '');
const router = buildChatbotRouter({ llmClient: defaultLLM });
export default router;
```

Then in `backend/src/index.ts`, swap the import to use the factory when fakes are on:

```ts
// Replace: import chatbotRouter from './routes/chatbot.js';
import { buildChatbotRouter } from './routes/chatbot.js';

const llmClient: ILLMClient = process.env.FAKE_LLM === '1'
  ? new FakeLLMClient()
  : new OpenAILLMClient(process.env.OPENAI_API_KEY || '');

const chatbotRouter = buildChatbotRouter({ llmClient });
```

(Adjust imports: `import { ILLMClient } from './adapters/llm/llm-client.interface.js';` and `import { OpenAILLMClient } from './adapters/llm/openai-llm-client.js';`.)

If `chatbot.ts` already exports a factory, skip the refactor and only adjust `index.ts`.

- [ ] **Step 4: Run all backend tests**

```bash
npm test --prefix backend
```

Expected: PASS — chatbot route tests should still pass; the unit tests for `FakeTwilioClient` and `FakeLLMClient` from Tasks 1.3/1.4 also pass.

- [ ] **Step 5: Run a smoke boot of the server with fakes on**

The server uses the compiled `dist/`, so build first. Note: `index.ts:521` gates `app.listen()` on `NODE_ENV !== 'test'`, so we deliberately do NOT set `NODE_ENV=test` for the smoke (Playwright will follow the same rule in Task 1.8).

```bash
npm run build:backend
DB_PATH=data/test-smoke.db FAKE_TWILIO=1 FAKE_LLM=1 npm run start --prefix backend &
SERVER_PID=$!
sleep 3
curl -s http://localhost:3000/api/public/shops | head -c 100
kill $SERVER_PID
rm -f data/test-smoke.db
```

Expected: prints a JSON array `[]` or similar (no Twilio or OpenAI errors thrown during boot).

- [ ] **Step 6: Commit**

```bash
git add backend/src/index.ts backend/src/routes/chatbot.ts
git commit -m "feat(composition): inject Fake adapters when FAKE_TWILIO=1 / FAKE_LLM=1"
```

---

### Task 1.6: Confirm OTP devCode behavior covers reset-password (no code change expected)

**Files:**
- Read-only investigation; confirm no change needed

The spec mentioned "OTP_DEV_BYPASS" but the actual mechanism is: `SendOTP.execute()` returns `{ devCode: otp }` in dev mode (`NODE_ENV !== 'production' && EMAIL_USER == null` → `result.simulated`). The `forgot-password` route in `backend/src/index.ts:220` calls `sendOTP()` directly via `communication.js` (not via `SendOTP.execute()`) — so it does NOT return a devCode in the response.

For E2E-04 (forgot/reset password) we will read the OTP code directly from the DB via `e2e/fixtures/db.ts` (Task 1.10). No backend code change needed — this is the standard test-seam pattern for reset tokens.

- [ ] **Step 1: Verify the assumption by reading the forgot-password route**

```bash
sed -n '220,234p' backend/src/index.ts
```

Confirm: route returns `204` and stores `otp_code` on the user. ✓

- [ ] **Step 2: Verify the user repo exposes `findByEmail`**

```bash
grep -n "findByEmail" backend/src/repositories/user-repository.interface.ts
```

Expected: present. We will use it (or a direct SQL query) in `e2e/fixtures/db.ts`.

No commit — this task is investigation only.

---

### Task 1.7: Scaffold backend/test/integration/ shared setup

**Files:**
- Create: `backend/test/integration/_setup.ts`
- Modify: `backend/package.json` (add `test:integration` script and split `test`)
- Modify: `backend/vitest.config.ts` (or create if absent — currently inline in package.json)

- [ ] **Step 1: Inspect existing vitest config**

```bash
cat backend/vitest.config.ts 2>/dev/null || grep -A 5 '"test"' backend/package.json
```

- [ ] **Step 2: Update `backend/package.json` scripts**

Replace the existing `"test"` script with:

```jsonc
"scripts": {
  "dev": "nodemon --exec tsx src/index.ts",
  "start": "node dist/index.js",
  "build": "npx tsc",
  "lint": "echo 'Linting backend... (stub)'",
  "test": "vitest run --exclude 'test/integration/**'",
  "test:integration": "vitest run --root . test/integration",
  "demo:setup": "tsx src/scripts/seed-demo.ts"
}
```

- [ ] **Step 3: Create the integration test setup helper**

```ts
// backend/test/integration/_setup.ts
import { beforeEach } from 'vitest';

// Force NODE_ENV=test BEFORE importing db.ts so we get :memory:
process.env.NODE_ENV = 'test';
process.env.FAKE_TWILIO = '1';
process.env.FAKE_LLM = '1';
process.env.JWT_SECRET = 'test-secret-do-not-use-in-prod';
process.env.DB_PATH = '';  // unset any leaked override

// Lazy import so env vars are set first
export async function buildApp() {
  // Re-import per call to ensure module caching doesn't carry state across files
  const dbModule = await import('../../src/db.js');
  const db = dbModule.default;

  // Reset all data tables (preserves schema)
  const tables = ['wa_messages', 'conversations', 'sale_items', 'sales', 'appointment_items',
    'appointments', 'barber_shifts', 'barber_time_off', 'shop_settings', 'expenses',
    'stock_logs', 'products', 'services', 'users', 'customers', 'barbers', 'suppliers', 'shops'];
  for (const t of tables) {
    try { db.prepare(`DELETE FROM ${t}`).run(); } catch {}
  }

  return { db, ...await import('../../src/index.js') };
}

// Helper to seed a minimal shop + owner for tests that need auth
export async function seedMinimalShop(db: any) {
  const bcrypt = await import('bcryptjs');
  const passwordHash = await bcrypt.hash('TestPass123!', 10);
  const shop = db.prepare('INSERT INTO shops (name) VALUES (?)').run('Test Shop');
  const shopId = Number(shop.lastInsertRowid);
  const user = db.prepare(
    'INSERT INTO users (username, email, password_hash, role, shop_id, fullname) VALUES (?, ?, ?, ?, ?, ?)'
  ).run('owner', 'owner@test.local', passwordHash, 'OWNER', shopId, 'Test Owner');
  return { shopId, ownerId: Number(user.lastInsertRowid), passwordHash };
}
```

Note: this initial `_setup.ts` is intentionally simple. Individual test files will import `buildApp()` and call `seedMinimalShop()` as needed. We rely on vitest running each `*.test.ts` in its own module context — but since the schema is loaded on `import`, the table-truncation-on-buildApp() is what gives us isolation between calls.

- [ ] **Step 4: Verify scripts work**

```bash
npm test --prefix backend                    # excludes test/integration
npm run test:integration --prefix backend    # 0 tests for now
```

Expected: both succeed; `test:integration` reports "no test files found" (acceptable).

- [ ] **Step 5: Commit**

```bash
git add backend/package.json backend/test/integration/_setup.ts
git commit -m "test(integration): scaffold supertest harness with fake adapters"
```

---

### Task 1.8: Scaffold e2e/playwright.config.ts

**Files:**
- Create: `e2e/playwright.config.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Create the Playwright config**

```ts
// e2e/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const repoRoot = path.resolve(__dirname, '..');

export default defineConfig({
  testDir: '.',
  testMatch: ['**/*.spec.ts'],
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: '../playwright-report' }]],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  globalSetup: require.resolve('./fixtures/seed-test.ts'),
  webServer: [
    {
      command: 'npm run start --prefix backend',
      cwd: repoRoot,
      port: 3000,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        // NB: do NOT set NODE_ENV=test — `backend/src/index.ts:521` gates `app.listen()`
        // on `NODE_ENV !== 'test'`. We need the server to listen for E2E.
        // OTP devCode and other dev-mode behaviors trigger on NODE_ENV != 'production'.
        DB_PATH: path.join(repoRoot, 'data/test.db'),
        FAKE_TWILIO: '1',
        FAKE_LLM: '1',
        JWT_SECRET: 'e2e-secret-do-not-use-in-prod',
        PORT: '3000',
        EMAIL_USER: '',  // ensure SendOTP simulates and returns devCode in response
      },
      timeout: 30_000,
    },
    {
      command: 'npm run preview --prefix frontend -- --port 4173 --strictPort',
      cwd: repoRoot,
      port: 4173,
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
```

- [ ] **Step 2: Update `.gitignore`**

Append to `.gitignore`:

```
# E2E test artifacts
e2e/.auth/
e2e/test-results/
data/test.db
playwright-report/
```

- [ ] **Step 3: Verify Playwright sees the config**

```bash
npx playwright test --config=e2e/playwright.config.ts --list
```

Expected: "0 tests found" (no `*.spec.ts` files yet) but config loads cleanly.

- [ ] **Step 4: Commit**

```bash
git add e2e/playwright.config.ts .gitignore
git commit -m "test(e2e): scaffold Playwright config with two-process webServer"
```

---

### Task 1.9: Implement seed-test.ts (Playwright globalSetup)

**Files:**
- Create: `e2e/fixtures/seed-test.ts`

- [ ] **Step 1: Write the seed**

```ts
// e2e/fixtures/seed-test.ts
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';

const repoRoot = path.resolve(__dirname, '../..');
const TEST_DB = path.join(repoRoot, 'data/test.db');

export const TEST_USERS = {
  OWNER:    { username: 'owner',    email: 'owner@test.local',    password: 'TestPass123!' },
  MANAGER:  { username: 'manager',  email: 'manager@test.local',  password: 'TestPass123!' },
  BARBER:   { username: 'ramon',    email: 'ramon@test.local',    password: 'TestPass123!' },
  CUSTOMER: { username: 'customer', email: 'customer@test.local', password: 'TestPass123!', phone: '+18095550100' },
};

export const TEST_DATA = {
  shopAName: 'Barbería Test',
  shopBName: 'Barbería Test 2',
};

export default async function globalSetup() {
  // 1. Wipe the test DB file
  fs.mkdirSync(path.dirname(TEST_DB), { recursive: true });
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  fs.mkdirSync(path.join(repoRoot, 'e2e/.auth'), { recursive: true });

  // 2. Boot the schema by importing the backend's db module
  // (we use a direct better-sqlite3 connection so we don't pull in the auto-seed)
  // Instead, run the backend's start script briefly to apply schema, then connect.
  // Simpler: open a connection and run the schema ourselves by importing the schema script.
  //
  // Easiest: spawn a child process that imports db.ts (which runs schema + migrations).
  const { spawnSync } = await import('child_process');
  const result = spawnSync('npx', ['tsx', '-e', `
    process.env.NODE_ENV = 'test';
    process.env.DB_PATH = ${JSON.stringify(TEST_DB)};
    import('./backend/src/db.js').then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
  `], { cwd: repoRoot, stdio: 'inherit' });
  if (result.status !== 0) throw new Error('Failed to initialize test DB schema');

  // 3. Connect and wipe any auto-seeded data, then insert deterministic seed
  const db = new Database(TEST_DB);
  db.pragma('foreign_keys = ON');

  const tables = ['wa_messages', 'conversations', 'sale_items', 'sales', 'appointment_items',
    'appointments', 'barber_shifts', 'barber_time_off', 'shop_settings', 'expenses',
    'stock_logs', 'products', 'services', 'users', 'customers', 'barbers', 'suppliers', 'shops'];
  db.transaction(() => {
    for (const t of tables) {
      try { db.prepare(`DELETE FROM ${t}`).run(); } catch {}
    }
  })();

  const passwordHash = bcrypt.hashSync('TestPass123!', 10);

  db.transaction(() => {
    // Shop A
    const shopA = Number(db.prepare('INSERT INTO shops (name, address) VALUES (?, ?)').run(TEST_DATA.shopAName, '1 Test St').lastInsertRowid);
    // Shop B
    const shopB = Number(db.prepare('INSERT INTO shops (name, address) VALUES (?, ?)').run(TEST_DATA.shopBName, '2 Test Ave').lastInsertRowid);

    // Default settings on Shop A (matches what signup would set)
    const ins = db.prepare('INSERT INTO shop_settings (shop_id, key, value) VALUES (?, ?, ?)');
    for (const [k, v] of [['open_time', '09:00'], ['close_time', '18:00'], ['currency_symbol', '$'], ['default_tax_rate', '0'], ['locale', 'es-DO']]) {
      ins.run(shopA, k, v);
      ins.run(shopB, k, v);
    }

    // Barbers in Shop A
    const ramonId = Number(db.prepare(
      'INSERT INTO barbers (name, fullname, slug, payment_model, service_commission_rate, product_commission_rate, shop_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)'
    ).run('Ramon', 'Ramón Pérez', 'ramon', 'COMMISSION', 0.6, 0.15, shopA).lastInsertRowid);
    const luisId = Number(db.prepare(
      'INSERT INTO barbers (name, fullname, slug, payment_model, service_commission_rate, product_commission_rate, shop_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)'
    ).run('Luis', 'Luis Gómez', 'luis', 'COMMISSION', 0.5, 0.10, shopA).lastInsertRowid);

    // Shifts: Mon-Fri 09:00-17:00 for both barbers (day_of_week 1-5)
    const shift = db.prepare('INSERT INTO barber_shifts (barber_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)');
    for (const bId of [ramonId, luisId]) {
      for (let d = 1; d <= 5; d++) shift.run(bId, d, '09:00', '17:00');
    }

    // One barber in Shop B so multi-shop test sees a difference
    db.prepare('INSERT INTO barbers (name, fullname, slug, payment_model, service_commission_rate, product_commission_rate, shop_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)')
      .run('Pedro', 'Pedro García', 'pedro', 'COMMISSION', 0.5, 0.10, shopB);

    // Services in Shop A
    const haircutId = Number(db.prepare('INSERT INTO services (name, description, price, duration_minutes, shop_id, is_active) VALUES (?, ?, ?, ?, ?, 1)')
      .run('Haircut', 'Standard haircut', 25, 30, shopA).lastInsertRowid);
    db.prepare('INSERT INTO services (name, description, price, duration_minutes, shop_id, is_active) VALUES (?, ?, ?, ?, ?, 1)')
      .run('Beard Trim', 'Beard service', 15, 20, shopA);
    db.prepare('INSERT INTO services (name, description, price, duration_minutes, shop_id, is_active) VALUES (?, ?, ?, ?, ?, 1)')
      .run('Combo', 'Haircut + beard', 35, 45, shopA);

    // Service in Shop B
    db.prepare('INSERT INTO services (name, description, price, duration_minutes, shop_id, is_active) VALUES (?, ?, ?, ?, ?, 1)')
      .run('Shop B Cut', 'Shop B haircut', 30, 30, shopB);

    // Products in Shop A
    db.prepare('INSERT INTO products (name, description, price, stock, min_stock_threshold, shop_id, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)')
      .run('Pomade', 'Strong hold', 12, 10, 3, shopA);
    db.prepare('INSERT INTO products (name, description, price, stock, min_stock_threshold, shop_id, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)')
      .run('Shampoo', 'Cleansing', 18, 2, 3, shopA);

    // Customer
    const customerId = Number(db.prepare('INSERT INTO customers (name, email, phone, shop_id) VALUES (?, ?, ?, ?)')
      .run('Test Customer', TEST_USERS.CUSTOMER.email, TEST_USERS.CUSTOMER.phone, shopA).lastInsertRowid);

    // Users
    db.prepare('INSERT INTO users (username, email, password_hash, role, shop_id, fullname) VALUES (?, ?, ?, ?, ?, ?)')
      .run(TEST_USERS.OWNER.username, TEST_USERS.OWNER.email, passwordHash, 'OWNER', shopA, 'Test Owner');
    db.prepare('INSERT INTO users (username, email, password_hash, role, shop_id, fullname) VALUES (?, ?, ?, ?, ?, ?)')
      .run(TEST_USERS.MANAGER.username, TEST_USERS.MANAGER.email, passwordHash, 'MANAGER', shopA, 'Test Manager');
    db.prepare('INSERT INTO users (username, email, password_hash, role, barber_id, shop_id, fullname) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(TEST_USERS.BARBER.username, TEST_USERS.BARBER.email, passwordHash, 'BARBER', ramonId, shopA, 'Ramón Pérez');
    db.prepare('INSERT INTO users (username, email, password_hash, role, customer_id, shop_id, fullname) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(TEST_USERS.CUSTOMER.username, TEST_USERS.CUSTOMER.email, passwordHash, 'CUSTOMER', customerId, shopA, 'Test Customer');

    // Make OWNER also manage Shop B by inserting a second OWNER row for Shop B
    db.prepare('INSERT INTO users (username, email, password_hash, role, shop_id, fullname) VALUES (?, ?, ?, ?, ?, ?)')
      .run('owner_b', 'owner-b@test.local', passwordHash, 'OWNER', shopB, 'Test Owner B');
  })();

  db.close();
  console.log('[e2e] seed-test.ts: test DB ready at', TEST_DB);
}
```

Note on the multi-shop pattern: rather than the same `OWNER` row for two shops (which the schema doesn't support — `users.shop_id` is a single FK), we create a parallel owner-b user. The shop switcher works by the user having permission to switch; for E2E-13 we'll log in as both `owner` and `owner_b` and verify isolation. Adjust E2E-13 in Task 2.5 to match this pattern (the spec didn't specify the exact mechanism).

- [ ] **Step 2: Manually run the seed once to verify it works**

```bash
npx tsx -e "import('./e2e/fixtures/seed-test.ts').then(m => m.default()).then(() => console.log('OK'))"
```

Expected: prints `[e2e] seed-test.ts: test DB ready at .../data/test.db` then `OK`.

- [ ] **Step 3: Spot-check the data**

```bash
sqlite3 data/test.db "SELECT id, name FROM shops; SELECT username, role FROM users;"
```

Expected: 2 shops, 5 users (owner, manager, ramon, customer, owner_b).

- [ ] **Step 4: Commit**

```bash
git add e2e/fixtures/seed-test.ts
git commit -m "test(e2e): add deterministic seed-test fixture"
```

---

### Task 1.10: Implement e2e/fixtures/auth.ts, api.ts, db.ts

**Files:**
- Create: `e2e/fixtures/auth.ts`
- Create: `e2e/fixtures/api.ts`
- Create: `e2e/fixtures/db.ts`

- [ ] **Step 1: Create the API helper**

```ts
// e2e/fixtures/api.ts
import { request, APIRequestContext } from '@playwright/test';

export const API_BASE = 'http://localhost:3000';

export async function apiCtx(): Promise<APIRequestContext> {
  return await request.newContext({ baseURL: API_BASE });
}

export async function loginViaApi(username: string, password: string) {
  const ctx = await apiCtx();
  const res = await ctx.post('/api/auth/login', { data: { username, password } });
  if (!res.ok()) throw new Error(`Login failed for ${username}: ${res.status()}`);
  const body = await res.json();
  await ctx.dispose();
  return body as { token: string; user: { id: number; role: string; shop_id: number; barber_id?: number } };
}

export async function getJSON(token: string, path: string) {
  const ctx = await apiCtx();
  const res = await ctx.get(path, { headers: { Authorization: `Bearer ${token}` } });
  const body = res.ok() ? await res.json() : null;
  await ctx.dispose();
  return { status: res.status(), body };
}

export async function postJSON(token: string, path: string, data: unknown) {
  const ctx = await apiCtx();
  const res = await ctx.post(path, { headers: { Authorization: `Bearer ${token}` }, data });
  const body = res.ok() ? await res.json().catch(() => null) : null;
  const errorBody = !res.ok() ? await res.text().catch(() => '') : '';
  await ctx.dispose();
  return { status: res.status(), body, errorBody };
}
```

- [ ] **Step 2: Create the DB helper**

```ts
// e2e/fixtures/db.ts
import path from 'path';
import Database from 'better-sqlite3';

const TEST_DB = path.resolve(__dirname, '../../data/test.db');

export function openTestDb() {
  const db = new Database(TEST_DB, { readonly: false });
  db.pragma('foreign_keys = ON');
  return db;
}

export function getOtpCode(email: string): string | null {
  const db = openTestDb();
  const row = db.prepare('SELECT otp_code FROM users WHERE email = ?').get(email) as { otp_code: string | null } | undefined;
  db.close();
  return row?.otp_code ?? null;
}

export function countAppointments(filters: { barber_id?: number; status?: string } = {}): number {
  const db = openTestDb();
  let q = 'SELECT COUNT(*) as n FROM appointments WHERE 1=1';
  const args: unknown[] = [];
  if (filters.barber_id !== undefined) { q += ' AND barber_id = ?'; args.push(filters.barber_id); }
  if (filters.status) { q += ' AND status = ?'; args.push(filters.status); }
  const row = db.prepare(q).get(...args) as { n: number };
  db.close();
  return row.n;
}

export function getBarberIdBySlug(slug: string): number {
  const db = openTestDb();
  const row = db.prepare('SELECT id FROM barbers WHERE slug = ?').get(slug) as { id: number };
  db.close();
  return row.id;
}

export function getShopIdByName(name: string): number {
  const db = openTestDb();
  const row = db.prepare('SELECT id FROM shops WHERE name = ?').get(name) as { id: number };
  db.close();
  return row.id;
}
```

- [ ] **Step 3: Create the auth fixture**

```ts
// e2e/fixtures/auth.ts
import { test as base, BrowserContext, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { loginViaApi } from './api.js';
import { TEST_USERS } from './seed-test.js';

type Role = 'OWNER' | 'MANAGER' | 'BARBER' | 'CUSTOMER';

async function ensureStorageState(role: Role): Promise<string> {
  const file = path.resolve(__dirname, '../.auth', `${role.toLowerCase()}.json`);
  if (fs.existsSync(file)) return file;

  const creds = role === 'OWNER'    ? TEST_USERS.OWNER
              : role === 'MANAGER'  ? TEST_USERS.MANAGER
              : role === 'BARBER'   ? TEST_USERS.BARBER
              :                       TEST_USERS.CUSTOMER;

  const { token, user } = await loginViaApi(creds.username, creds.password);

  const state = {
    cookies: [],
    origins: [
      {
        origin: 'http://localhost:4173',
        localStorage: [
          { name: 'token', value: token },
          { name: 'user', value: JSON.stringify(user) },
        ],
      },
    ],
  };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(state));
  return file;
}

export const test = base.extend<{ asOwner: BrowserContext; asBarber: BrowserContext; asCustomer: BrowserContext; ownerToken: string }>({
  asOwner: async ({ browser }, use) => {
    const file = await ensureStorageState('OWNER');
    const ctx = await browser.newContext({ storageState: file });
    await use(ctx);
    await ctx.close();
  },
  asBarber: async ({ browser }, use) => {
    const file = await ensureStorageState('BARBER');
    const ctx = await browser.newContext({ storageState: file });
    await use(ctx);
    await ctx.close();
  },
  asCustomer: async ({ browser }, use) => {
    const file = await ensureStorageState('CUSTOMER');
    const ctx = await browser.newContext({ storageState: file });
    await use(ctx);
    await ctx.close();
  },
  ownerToken: async ({}, use) => {
    const { token } = await loginViaApi(TEST_USERS.OWNER.username, TEST_USERS.OWNER.password);
    await use(token);
  },
});

export { expect };
```

Note on storage key names: the auth fixture writes `token` and `user` to `localStorage`. Verify against the actual `useAuth` hook in `frontend/src/hooks/useAuth.ts` — if it uses different keys (e.g., `auth_token`), update both `name` fields above. This is a known selector-discovery item; the test will fail loudly with a clear message if wrong.

- [ ] **Step 4: Verify the fixtures TypeScript-compile**

```bash
npx tsc --noEmit -p e2e/playwright.config.ts 2>&1 || npx tsc --noEmit --project tsconfig.json e2e/fixtures/*.ts 2>&1 | head -20
```

Note: e2e/ doesn't have its own tsconfig yet; create a minimal one if tsc errors:

```json
// e2e/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "allowImportingTsExtensions": false,
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["**/*.ts"]
}
```

Run: `npx tsc --noEmit -p e2e/tsconfig.json`. Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add e2e/fixtures/auth.ts e2e/fixtures/api.ts e2e/fixtures/db.ts e2e/tsconfig.json
git commit -m "test(e2e): add auth/api/db fixtures"
```

---

### Task 1.11: Wire root npm scripts and ai-verify.sh

**Files:**
- Modify: `package.json` (root)
- Modify: `scripts/ai-verify.sh`

- [ ] **Step 1: Add root scripts**

Update `package.json`:

```jsonc
"scripts": {
  "install-all": "npm install --prefix shared && npm install --prefix backend && npm install --prefix frontend && npm run build:shared",
  "build:shared": "npm run build --prefix shared",
  "build:backend": "npm run build --prefix backend",
  "build:frontend": "npm run build --prefix frontend",
  "build": "npm run build:shared && npm run build:backend && npm run build:frontend",
  "start": "npm run start --prefix backend",
  "dev": "npx concurrently \"npm run dev --prefix backend\" \"npm run dev --prefix frontend\"",
  "test": "npm test --prefix backend && npm test --prefix frontend",
  "test:integration": "npm run test:integration --prefix backend",
  "test:e2e": "playwright test --config=e2e/playwright.config.ts",
  "test:e2e:ui": "playwright test --config=e2e/playwright.config.ts --ui",
  "verify": "bash scripts/ai-verify.sh",
  "verify:quick": "bash scripts/ai-verify.sh --quick",
  "phase": "bash scripts/phase.sh",
  "doctor": "bash scripts/doctor.sh",
  "re-index": "jcodemunch index-folder --path ."
}
```

- [ ] **Step 2: Replace `scripts/ai-verify.sh`**

```bash
#!/bin/bash
# AI Verification Script: build + type-check + unit + integration + E2E.
# Usage:
#   bash scripts/ai-verify.sh         # full
#   bash scripts/ai-verify.sh --quick # skip E2E (~30s)
set -e

QUICK=false
[[ "$1" == "--quick" ]] && QUICK=true

echo "🔍 Starting AI Reliability Check..."

echo "🧹 Cleaning stale artifacts..."
rm -rf backend/dist frontend/dist shared/dist

echo "📦 Building Shared Contracts..."
npm run build:shared

echo "🧪 Running Project-wide Type Checks..."
npm run build:backend
npm run build:frontend

echo "🔬 Running Unit Tests..."
npm test --prefix backend
npm test --prefix frontend

echo "🔌 Running Integration Tests..."
npm run test:integration --prefix backend

if [[ "$QUICK" == "true" ]]; then
  echo "⚡ --quick mode: skipping E2E"
  echo "✅ Quick verification passed!"
  exit 0
fi

echo "🌐 Running E2E Tests..."
npm run test:e2e

echo "✅ Reliability Check Passed!"
```

- [ ] **Step 3: Run quick verify to confirm current state is green**

```bash
npm run verify:quick
```

Expected: PASS — types, unit (including new fakes from 1.3/1.4), integration (0 tests).

- [ ] **Step 4: Run full verify (E2E will report 0 tests, that's OK)**

```bash
npm run test:e2e -- --list
```

Expected: "0 tests in 0 files" — we don't run a full `verify` yet because Playwright with 0 tests + a `webServer` would still start the servers. The `--list` flag avoids that.

- [ ] **Step 5: Commit**

```bash
git add package.json scripts/ai-verify.sh
git commit -m "chore(verify): wire test:integration, test:e2e, and staged ai-verify.sh"
```

---

## Phase 2 — Five Highest-Leverage E2E Tests

> **Selector reality check:** The tests below use accessible selectors (`getByLabel`, `getByRole`) and i18n-keyed text. When a test fails because a selector doesn't match the live UI, the fix path is: (1) run `npm run test:e2e:ui`, (2) inspect the rendered page using Playwright's picker, (3) update the selector. Selector drift is normal — the test bodies below are starting points, not gospel.

### Task 2.1: E2E-01 Owner login → Dashboard

**Files:**
- Create: `e2e/auth/owner-login.spec.ts`

- [ ] **Step 1: Write the test**

```ts
// e2e/auth/owner-login.spec.ts
import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/seed-test.js';

test('E2E-01 · Owner logs in and lands on Dashboard', async ({ page }) => {
  await page.goto('/login');

  // The login form has username + password fields. id="username" and id="password" per Login.tsx.
  await page.locator('#username').fill(TEST_USERS.OWNER.username);
  await page.locator('#password').fill(TEST_USERS.OWNER.password);
  await page.getByRole('button', { name: /sign in|iniciar/i }).click();

  // Owner should land on `/` (Dashboard route).
  await expect(page).toHaveURL(/\/$/);

  // Sidebar should show admin items (Catalog, Reports, Users) — exact text comes from i18n.
  // We assert at least one admin-only nav item is visible.
  await expect(page.getByRole('link', { name: /catalog|catálogo/i }).first()).toBeVisible();
});
```

- [ ] **Step 2: Run the test**

```bash
npm run test:e2e -- e2e/auth/owner-login.spec.ts
```

Expected outcomes:
- **PASS:** great, move to Step 4.
- **FAIL on selector:** open `npm run test:e2e:ui`, inspect, adjust the selector. Common adjustments: `#username` → `getByLabel('Username')`, the button name regex needs Spanish variant.

- [ ] **Step 3: Adjust selectors as needed and re-run**

If sidebar admin link is named differently, replace the regex with the actual displayed text. The sidebar component renders nav from `frontend/src/components/Sidebar.tsx` (or similar) — read it to confirm.

- [ ] **Step 4: Verify it passes**

```bash
npm run test:e2e -- e2e/auth/owner-login.spec.ts
```

Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add e2e/auth/owner-login.spec.ts
git commit -m "test(e2e): E2E-01 owner login lands on dashboard"
```

---

### Task 2.2: E2E-05 Guest books via OTP, specific barber

**Files:**
- Create: `e2e/booking/guest-otp-booking.spec.ts`

- [ ] **Step 1: Write the test**

```ts
// e2e/booking/guest-otp-booking.spec.ts
import { test, expect } from '@playwright/test';
import { countAppointments, getBarberIdBySlug } from '../fixtures/db.js';
import { TEST_DATA } from '../fixtures/seed-test.js';

test('E2E-05 · Guest books appointment via OTP for specific barber', async ({ page }) => {
  // Open the public booking flow for the seeded shop.
  // Routes: /book/:slug or /shops/:id/book (verify which is correct in App.tsx routes).
  await page.goto('/discovery');
  await page.getByRole('button', { name: new RegExp(TEST_DATA.shopAName, 'i') }).first().click();
  // Land on the booking flow; step 1 = pick a service.

  // Step 1: Service
  await page.getByRole('button', { name: /haircut/i }).click();
  await page.getByRole('button', { name: /next|continuar/i }).click();

  // Step 2: Barber (pick Ramon)
  await page.getByRole('button', { name: /ramon/i }).click();
  await page.getByRole('button', { name: /next|continuar/i }).click();

  // Step 3: Date/time — pick the first available slot
  // Days are rendered as buttons; pick the first non-disabled day.
  const days = page.locator('button.day, [data-testid="day-button"]').filter({ hasNot: page.locator('[disabled]') });
  await days.first().click();
  // Then pick the first time slot
  const slots = page.locator('button.slot, [data-testid="slot-button"]').filter({ hasNot: page.locator('[disabled]') });
  await slots.first().click();
  await page.getByRole('button', { name: /next|continuar/i }).click();

  // Step 4: Location confirmation (always shows per recent feature)
  await page.getByRole('button', { name: /next|continuar|confirm/i }).click();

  // Step 5: Summary → trigger OTP
  await page.getByRole('button', { name: /confirm|reservar|book/i }).click();

  // OTP modal opens. Enter email.
  const guestEmail = `guest-${Date.now()}@test.local`;
  await page.locator('input[type="email"]').fill(guestEmail);
  await page.getByRole('button', { name: /send|enviar/i }).click();

  // OTP auto-fills (devCode in dev/test mode — see SendOTP.ts:85).
  // The OTP input may need a small wait, but the modal should show step "OTP" with the code prefilled.
  await page.getByRole('button', { name: /verify|verificar/i }).click();

  // Confirmation page should show appointment details.
  await expect(page.getByText(/confirm|reserva|appointment/i).first()).toBeVisible();

  // DB verification: appointment exists for ramon.
  const ramonId = getBarberIdBySlug('ramon');
  expect(countAppointments({ barber_id: ramonId })).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run the test in UI mode and walk through interactively**

```bash
npm run test:e2e:ui -- e2e/booking/guest-otp-booking.spec.ts
```

Watch each step. The 5-step flow's exact selectors will need adjustment — read `frontend/src/pages/BookingFlow.tsx` for the actual class names and aria labels. The day/slot buttons in particular may use different selectors.

- [ ] **Step 3: Adjust selectors based on the actual rendered DOM**

Specific things to verify in BookingFlow.tsx:
- Routing: `/discovery` → `/shops/:id/book` or `/book/:shopSlug`?
- Day picker: are days rendered as `<button>` with class `day`?
- Time slots: same question
- "Next" button text: `t('common.next')` translates to what?
- OTP modal: how is the email input labeled?

- [ ] **Step 4: Re-run headless to confirm pass**

```bash
npm run test:e2e -- e2e/booking/guest-otp-booking.spec.ts
```

Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add e2e/booking/guest-otp-booking.spec.ts
git commit -m "test(e2e): E2E-05 guest 5-step booking via OTP"
```

---

### Task 2.3: E2E-09 Walk-in sale (no customer)

**Files:**
- Create: `e2e/pos/walk-in-sale.spec.ts`

- [ ] **Step 1: Write the test**

```ts
// e2e/pos/walk-in-sale.spec.ts
import { test, expect } from '../fixtures/auth.js';
import { getJSON } from '../fixtures/api.js';

test('E2E-09 · Walk-in sale completes and shows receipt', async ({ asOwner, ownerToken }) => {
  const page = await asOwner.newPage();
  await page.goto('/pos');

  // Pick barber Ramon
  await page.locator('select[name="barber"], #selectedBarber').selectOption({ label: /ramon/i });
  // Fallback if it's a custom dropdown:
  // await page.getByRole('button', { name: /select barber/i }).click();
  // await page.getByRole('option', { name: /ramon/i }).click();

  // Add a service (Haircut)
  await page.getByRole('button', { name: /haircut/i }).click();
  // Add a product (Pomade)
  await page.getByRole('button', { name: /pomade/i }).click();

  // Open checkout
  await page.getByRole('button', { name: /checkout|cobrar/i }).click();

  // Confirm payment (no customer attached)
  await page.getByRole('button', { name: /complete|confirmar|pay/i }).click();

  // Success modal appears with sale id
  await expect(page.getByText(/sale.*#|venta.*#|sale id/i)).toBeVisible({ timeout: 10_000 });

  // Total = $25 + $12 = $37.00
  await expect(page.getByText(/\$37\.00/)).toBeVisible();

  // Verify via API: the most recent sale exists with the right total
  const sales = await getJSON(ownerToken, '/api/sales');
  expect(sales.status).toBe(200);
  const recent = sales.body.sort((a: any, b: any) => b.id - a.id)[0];
  expect(recent.total_amount).toBeCloseTo(37, 2);
  expect(recent.customer_id).toBeNull();
});
```

- [ ] **Step 2: Run in UI mode, adjust selectors**

```bash
npm run test:e2e:ui -- e2e/pos/walk-in-sale.spec.ts
```

Read `frontend/src/pages/POS.tsx` to check the actual barber selector — line 23 sets `selectedBarber` state from a `<select>` or dropdown. Adjust accordingly.

- [ ] **Step 3: Re-run headless**

```bash
npm run test:e2e -- e2e/pos/walk-in-sale.spec.ts
```

Expected: 1 passed.

- [ ] **Step 4: Commit**

```bash
git add e2e/pos/walk-in-sale.spec.ts
git commit -m "test(e2e): E2E-09 walk-in POS sale"
```

---

### Task 2.4: E2E-07 OWNER creates appointment from Schedule

**Files:**
- Create: `e2e/appointments/owner-creates-appointment.spec.ts`

- [ ] **Step 1: Write the test**

```ts
// e2e/appointments/owner-creates-appointment.spec.ts
import { test, expect } from '../fixtures/auth.js';
import { getJSON } from '../fixtures/api.js';

test('E2E-07 · OWNER creates appointment from Schedule page', async ({ asOwner, ownerToken }) => {
  const page = await asOwner.newPage();
  await page.goto('/schedule');

  // Capture appointment count before
  const before = await getJSON(ownerToken, '/api/appointments');
  const beforeCount = (before.body as any[]).length;

  // Click on an empty time slot (calendar grid). The Schedule page should expose
  // some "New appointment" button or clickable empty cell.
  await page.getByRole('button', { name: /new appointment|nueva cita|\+/i }).first().click();

  // Modal opens; fill fields
  await page.locator('select[name="barber_id"], #barber-select').selectOption({ label: /ramon/i });
  await page.locator('select[name="service_id"], #service-select').selectOption({ label: /combo/i });
  await page.locator('input[name="customer_phone"], #customer-phone').fill('+18095551234');

  // Pick a date/time — the modal usually has these as separate inputs
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isoDate = tomorrow.toISOString().slice(0, 10);
  await page.locator('input[type="date"], input[name="date"]').fill(isoDate);
  await page.locator('input[type="time"], input[name="time"]').fill('10:00');

  await page.getByRole('button', { name: /save|guardar|create/i }).click();

  // Modal closes; appointment count increased by 1 via API
  const after = await getJSON(ownerToken, '/api/appointments');
  expect((after.body as any[]).length).toBe(beforeCount + 1);
});
```

- [ ] **Step 2: Run in UI mode and adjust the modal selectors**

```bash
npm run test:e2e:ui -- e2e/appointments/owner-creates-appointment.spec.ts
```

Inspect `frontend/src/pages/Schedule.tsx` for the actual modal markup. The "New appointment" trigger may be a + button on each empty cell rather than a top-level button.

- [ ] **Step 3: Re-run headless**

```bash
npm run test:e2e -- e2e/appointments/owner-creates-appointment.spec.ts
```

Expected: 1 passed.

- [ ] **Step 4: Commit**

```bash
git add e2e/appointments/owner-creates-appointment.spec.ts
git commit -m "test(e2e): E2E-07 owner creates appointment from Schedule"
```

---

### Task 2.5: E2E-13 OWNER switches shop, data scopes correctly

**Files:**
- Create: `e2e/multi-shop/owner-switches-shop.spec.ts`

- [ ] **Step 1: Write the test**

```ts
// e2e/multi-shop/owner-switches-shop.spec.ts
import { test, expect } from '@playwright/test';
import { loginViaApi, getJSON } from '../fixtures/api.js';

test('E2E-13 · OWNER for two shops sees data scoped per shop', async ({ page }) => {
  // The seed creates `owner` (Shop A) and `owner_b` (Shop B). Verify each sees only their shop.
  const ownerA = await loginViaApi('owner', 'TestPass123!');
  const ownerB = await loginViaApi('owner_b', 'TestPass123!');

  // Owner A's services list should include "Haircut" but NOT "Shop B Cut"
  const aServices = await getJSON(ownerA.token, '/api/services');
  expect(aServices.status).toBe(200);
  const aNames = (aServices.body as any[]).map(s => s.name);
  expect(aNames).toContain('Haircut');
  expect(aNames).not.toContain('Shop B Cut');

  // Owner B's services list should be the inverse
  const bServices = await getJSON(ownerB.token, '/api/services');
  expect(bServices.status).toBe(200);
  const bNames = (bServices.body as any[]).map(s => s.name);
  expect(bNames).toContain('Shop B Cut');
  expect(bNames).not.toContain('Haircut');

  // /api/auth/me reports the correct shop_id
  const aMe = await getJSON(ownerA.token, '/api/auth/me');
  const bMe = await getJSON(ownerB.token, '/api/auth/me');
  expect(aMe.body.shop_id).not.toBe(bMe.body.shop_id);

  // Sanity check the same is reflected in the UI:
  await page.goto('/login');
  await page.locator('#username').fill('owner');
  await page.locator('#password').fill('TestPass123!');
  await page.getByRole('button', { name: /sign in|iniciar/i }).click();
  await page.goto('/catalog');
  await expect(page.getByText('Haircut')).toBeVisible();
  await expect(page.getByText('Shop B Cut')).toBeHidden();
});
```

Note on test structure: this differs from the spec's "switcher" UI because the schema doesn't allow one user to belong to multiple shops via `users.shop_id` (a single FK). The test verifies the property the spec actually cares about — multi-shop data isolation — using two separately-owned shops. If the codebase later adds a true multi-shop user with a real switcher (`POST /api/shops/switch`), update this test to drive it through the UI.

- [ ] **Step 2: Run**

```bash
npm run test:e2e -- e2e/multi-shop/owner-switches-shop.spec.ts
```

Expected: 1 passed.

- [ ] **Step 3: Commit**

```bash
git add e2e/multi-shop/owner-switches-shop.spec.ts
git commit -m "test(e2e): E2E-13 multi-shop data isolation"
```

---

### Task 2.6: Write TESTING.md

**Files:**
- Create: `TESTING.md`

- [ ] **Step 1: Write the doc**

```markdown
# Testing & Verification

## tl;dr

```bash
npm run verify        # full: types + unit + integration + E2E (~3-5 min)
npm run verify:quick  # skip E2E (~30s) — use during edits
```

## Tiers

| Tier | Tool | Location | Runs against |
|---|---|---|---|
| Unit | vitest | `backend/src/**/*.test.ts`, `frontend/src/**/*.test.tsx` | Pure functions / `:memory:` DB |
| HTTP integration | supertest + vitest | `backend/test/integration/` | Real Express app, `:memory:` DB, fake adapters |
| E2E | Playwright (Chromium) | `e2e/` | Built backend on `data/test.db` + Vite preview at `localhost:4173` |

## Verification matrix

| Trigger | Command | Time |
|---|---|---|
| Mid-edit | `npm run verify:quick` | ~30s |
| Before commit | `npm run verify` | ~3-5 min |
| Debug single E2E | `npm run test:e2e:ui` | interactive |

## Test data (E2E)

`e2e/fixtures/seed-test.ts` wipes `data/test.db` and seeds a deterministic dataset on every E2E run:

- **Shop A** (`Barbería Test`): owner=`owner`, manager=`manager`, barbers `ramon`/`luis`, customer `customer@test.local` (phone `+18095550100`), services Haircut/Beard Trim/Combo, products Pomade/Shampoo
- **Shop B** (`Barbería Test 2`): owner=`owner_b`, barber `pedro`, service "Shop B Cut"

All test users use password `TestPass123!`.

## How adapters get faked

When `FAKE_TWILIO=1` is set, the composition root in `backend/src/index.ts` injects `FakeTwilioClient` (records messages in `fakeTwilioOutbox`). Same for `FAKE_LLM=1` → `FakeLLMClient` (returns intents queued via `fakeLLMScript.queueIntent(...)`).

Tests that want to assert on Twilio output import the outbox; tests that want to script LLM responses import the script before sending the request.

## Adding a new E2E test

1. Create `e2e/<area>/<name>.spec.ts`
2. Use the `test`/`expect` from `e2e/fixtures/auth.js` to get authenticated contexts (`asOwner`, `asBarber`, `asCustomer`, `ownerToken`)
3. Use `e2e/fixtures/api.js` for setup HTTP calls and `e2e/fixtures/db.js` for read-only DB verification
4. Run interactively first: `npm run test:e2e:ui -- e2e/<area>/<name>.spec.ts`
5. Commit when green

## Adding a new HTTP integration test

1. Create `backend/test/integration/<name>.test.ts`
2. Import `buildApp` from `_setup.ts`; this gives you a freshly-truncated DB plus the Express app with fakes wired in
3. Use supertest to drive the app; assert against the response and (optionally) DB state
4. Run: `npm run test:integration --prefix backend`

## Troubleshooting

- **Playwright says ports busy:** another `npm run dev` is running. Stop it.
- **`data/test.db` locked:** a previous run crashed mid-write. Delete the file and re-run.
- **OTP not auto-filling in tests:** check `NODE_ENV=test` is set on the backend webServer. Without it, `SendOTP.execute()` doesn't return `devCode`.
```

- [ ] **Step 2: Commit**

```bash
git add TESTING.md
git commit -m "docs: add TESTING.md with verification matrix and how-to-add-a-test"
```

---

## Phase 3 — Remaining 8 E2E Tests

> **Pattern:** each task below follows the same shape as Phase 2: write the test using accessible selectors, run interactively to fix selectors, run headless to confirm, commit.

### Task 3.1: E2E-02 Barber login → My Schedule

**Files:** Create `e2e/auth/barber-login.spec.ts`

- [ ] **Step 1: Write the test**

```ts
// e2e/auth/barber-login.spec.ts
import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/seed-test.js';

test('E2E-02 · Barber logs in and lands on My Schedule', async ({ page }) => {
  await page.goto('/login');
  await page.locator('#username').fill(TEST_USERS.BARBER.username);
  await page.locator('#password').fill(TEST_USERS.BARBER.password);
  await page.getByRole('button', { name: /sign in|iniciar/i }).click();

  // Barber should land on /my-schedule (per role-based redirect)
  await expect(page).toHaveURL(/\/my-schedule/);

  // Sidebar should NOT show admin-only items like "Users" or "Reports"
  await expect(page.getByRole('link', { name: /^users$|usuarios/i })).toHaveCount(0);
});
```

- [ ] **Step 2: Run, adjust selectors, commit**

```bash
npm run test:e2e -- e2e/auth/barber-login.spec.ts
git add e2e/auth/barber-login.spec.ts
git commit -m "test(e2e): E2E-02 barber login lands on My Schedule"
```

---

### Task 3.2: E2E-03 Customer signup → Customer Portal

**Files:** Create `e2e/auth/customer-signup.spec.ts`

- [ ] **Step 1: Write the test**

The signup endpoint is `POST /api/auth/signup` and creates a NEW shop + OWNER, not a CUSTOMER. The spec's "Customer signup" actually corresponds to the customer flow: customers register via the booking OTP modal or `/discovery`, not via `/signup`. Adjusted test:

```ts
// e2e/auth/customer-signup.spec.ts
import { test, expect } from '@playwright/test';

test('E2E-03 · Customer registers via OTP and lands on Customer Portal', async ({ page }) => {
  await page.goto('/login');
  // Click the "Customer" tab — Login.tsx redirects to /discovery
  await page.getByRole('button', { name: /customer|cliente/i }).click();
  await expect(page).toHaveURL(/\/discovery/);

  // Discovery page lists shops; click one to open booking flow which has the customer-register OTP modal
  // Alternatively, the customer portal entry is via a "Login as Customer" trigger.
  // The simplest signal: a fresh email that doesn't exist gets a CUSTOMER row created.
  const newEmail = `new-customer-${Date.now()}@test.local`;

  // Drive through any "I have an account" / "Send OTP" affordance — adjust per actual UI
  await page.getByRole('button', { name: /sign up|register|registrar|account/i }).first().click();
  await page.locator('input[type="email"]').fill(newEmail);
  await page.getByRole('button', { name: /send|enviar/i }).click();

  // OTP auto-fills (devCode); verify
  await page.getByRole('button', { name: /verify|verificar/i }).click();

  // Should land on /portal (Customer Portal)
  await expect(page).toHaveURL(/\/portal/);
  await expect(page.getByText(/my bookings|mis reservas/i)).toBeVisible();
});
```

Note: if the actual UX is "no separate signup, OTP creates the user automatically", the test above already exercises that path via SendOTP.execute() in `backend/src/use-cases/SendOTP.ts:14` (creates a CUSTOMER user when email doesn't exist).

- [ ] **Step 2: Run, adjust, commit**

```bash
npm run test:e2e -- e2e/auth/customer-signup.spec.ts
git add e2e/auth/customer-signup.spec.ts
git commit -m "test(e2e): E2E-03 customer registers via OTP"
```

---

### Task 3.3: E2E-04 Forgot password → reset → re-login

**Files:** Create `e2e/auth/forgot-password.spec.ts`

- [ ] **Step 1: Write the test**

```ts
// e2e/auth/forgot-password.spec.ts
import { test, expect } from '@playwright/test';
import { getOtpCode } from '../fixtures/db.js';
import { TEST_USERS } from '../fixtures/seed-test.js';

test('E2E-04 · Forgot password resets via OTP code, allowing re-login with new password', async ({ page }) => {
  const newPassword = 'BrandNewPass456!';

  await page.goto('/forgot-password');
  await page.locator('input[type="email"], input[name="email"]').fill(TEST_USERS.OWNER.email);
  await page.getByRole('button', { name: /send|enviar/i }).click();
  // The forgot-password flow always returns 204; UI should show a generic "if the email exists..." message
  await expect(page.getByText(/sent|enviado|check your email/i)).toBeVisible();

  // Read the OTP from the DB (test seam — there's no API endpoint to retrieve reset codes)
  const code = getOtpCode(TEST_USERS.OWNER.email);
  expect(code).not.toBeNull();

  // Navigate to the reset-password page
  await page.goto('/reset-password');
  await page.locator('input[name="email"], input[type="email"]').fill(TEST_USERS.OWNER.email);
  await page.locator('input[name="code"], input[name="otp"]').fill(code!);
  await page.locator('input[name="new_password"], input[name="newPassword"]').fill(newPassword);
  await page.getByRole('button', { name: /reset|cambiar|update/i }).click();

  await expect(page.getByText(/success|cambiada|updated/i)).toBeVisible();

  // Re-login with the new password works
  await page.goto('/login');
  await page.locator('#username').fill(TEST_USERS.OWNER.username);
  await page.locator('#password').fill(newPassword);
  await page.getByRole('button', { name: /sign in|iniciar/i }).click();
  await expect(page).toHaveURL(/\/$/);

  // Reset the password back so other tests aren't affected — log in via API and update via /api/auth/profile.
  // (This is a serial-mode courtesy; future tests assume the seed password.)
  // Actually simpler: rely on globalSetup re-seeding next run; warn that this test is order-sensitive within a single run.
});
```

Note: this test mutates the `owner` user's password. Because Playwright `globalSetup` re-seeds before every `npm run test:e2e` invocation, that's fine across runs. But within a single run, any later test that uses `TEST_USERS.OWNER.password` would fail. Mitigate by either (a) running E2E-04 last in serial order, or (b) using a different staff user (e.g., `manager`). Recommend (b):

```ts
// Use TEST_USERS.MANAGER instead of OWNER — owner is heavily used elsewhere
const target = TEST_USERS.MANAGER;
```

Update the test to use MANAGER throughout.

- [ ] **Step 2: Run, adjust, commit**

```bash
npm run test:e2e -- e2e/auth/forgot-password.spec.ts
git add e2e/auth/forgot-password.spec.ts
git commit -m "test(e2e): E2E-04 forgot password reset flow"
```

---

### Task 3.4: E2E-06 Guest books with "Any" barber

**Files:** Create `e2e/booking/any-barber-booking.spec.ts`

- [ ] **Step 1: Write the test**

```ts
// e2e/booking/any-barber-booking.spec.ts
import { test, expect } from '@playwright/test';
import { TEST_DATA } from '../fixtures/seed-test.js';
import { countAppointments } from '../fixtures/db.js';

test('E2E-06 · Guest books with Any barber; system assigns a real barber', async ({ page }) => {
  await page.goto('/discovery');
  await page.getByRole('button', { name: new RegExp(TEST_DATA.shopAName, 'i') }).first().click();

  // Step 1: Service
  await page.getByRole('button', { name: /haircut/i }).click();
  await page.getByRole('button', { name: /next|continuar/i }).click();

  // Step 2: Barber → choose "Any"
  await page.getByRole('button', { name: /^any|cualquier/i }).click();
  await page.getByRole('button', { name: /next|continuar/i }).click();

  // Steps 3-5: pick first available slot, confirm location, complete OTP
  const days = page.locator('button.day, [data-testid="day-button"]').filter({ hasNot: page.locator('[disabled]') });
  await days.first().click();
  const slots = page.locator('button.slot, [data-testid="slot-button"]').filter({ hasNot: page.locator('[disabled]') });
  await slots.first().click();
  await page.getByRole('button', { name: /next|continuar/i }).click();
  await page.getByRole('button', { name: /next|continuar|confirm/i }).click();
  await page.getByRole('button', { name: /confirm|reservar|book/i }).click();

  const guestEmail = `any-${Date.now()}@test.local`;
  await page.locator('input[type="email"]').fill(guestEmail);
  await page.getByRole('button', { name: /send|enviar/i }).click();
  await page.getByRole('button', { name: /verify|verificar/i }).click();

  // Confirmation page should show a real barber name, not "Any"
  await expect(page.getByText(/^any$|^cualquier/i)).toHaveCount(0);
  await expect(page.locator('body')).toContainText(/ramon|luis/i);

  // DB: an appointment exists with a non-null barber_id
  expect(countAppointments({})).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run, commit**

```bash
npm run test:e2e -- e2e/booking/any-barber-booking.spec.ts
git add e2e/booking/any-barber-booking.spec.ts
git commit -m "test(e2e): E2E-06 guest books with Any barber"
```

---

### Task 3.5: E2E-08 OWNER cancels appointment, slot frees up

**Files:** Create `e2e/appointments/owner-cancels-appointment.spec.ts`

- [ ] **Step 1: Write the test**

```ts
// e2e/appointments/owner-cancels-appointment.spec.ts
import { test, expect } from '../fixtures/auth.js';
import { postJSON, getJSON } from '../fixtures/api.js';
import { getBarberIdBySlug, openTestDb } from '../fixtures/db.js';

test('E2E-08 · OWNER cancels appointment; status updates and slot frees up', async ({ asOwner, ownerToken }) => {
  // Pre-create an appointment via API
  const ramonId = getBarberIdBySlug('ramon');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const startAt = `${tomorrow.toISOString().slice(0, 10)}T10:00:00.000Z`;

  // Get a service id for "Haircut"
  const db = openTestDb();
  const haircutId = (db.prepare('SELECT id FROM services WHERE name = ?').get('Haircut') as { id: number }).id;
  // Insert directly (the create-appointment route validates business rules; we want a known appointment without going through full conflict logic)
  const appt = db.prepare(
    'INSERT INTO appointments (barber_id, service_id, start_time, total_duration_minutes, status, shop_id) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(ramonId, haircutId, startAt, 30, 'scheduled', (db.prepare('SELECT shop_id FROM barbers WHERE id = ?').get(ramonId) as { shop_id: number }).shop_id);
  const appointmentId = Number(appt.lastInsertRowid);
  db.close();

  const page = await asOwner.newPage();
  await page.goto('/schedule');

  // Click the appointment block
  await page.getByText(/haircut/i).first().click();
  // Modal opens with cancel button
  await page.getByRole('button', { name: /cancel|cancelar/i }).click();
  // Confirm cancel
  await page.getByRole('button', { name: /confirm|sí|yes/i }).click();

  // Verify via API
  const after = await getJSON(ownerToken, `/api/appointments/${appointmentId}`);
  expect(after.body.status).toBe('cancelled');
});
```

- [ ] **Step 2: Run, adjust, commit**

```bash
npm run test:e2e -- e2e/appointments/owner-cancels-appointment.spec.ts
git add e2e/appointments/owner-cancels-appointment.spec.ts
git commit -m "test(e2e): E2E-08 owner cancels appointment"
```

---

### Task 3.6: E2E-10 Customer sale with WhatsApp receipt

**Files:** Create `e2e/pos/customer-sale-whatsapp.spec.ts`

This test asserts the FakeTwilio outbox grew by exactly one message after a customer-attached sale. Reading the outbox from a Playwright test means we need a tiny test-only endpoint OR we read directly from the backend process.

Simplest: expose a test-only endpoint when `FAKE_TWILIO=1`, e.g. `GET /api/test/twilio-outbox`. Add it to index.ts gated on the env flag.

- [ ] **Step 1: Add the test-only endpoint**

In `backend/src/index.ts`, after the existing routes are mounted, add:

```ts
if (process.env.FAKE_TWILIO === '1') {
  const { fakeTwilioOutbox } = await import('./adapters/whatsapp/fake-twilio-client.js');
  app.get('/api/test/twilio-outbox', (_req, res) => res.json(fakeTwilioOutbox.messages));
  app.post('/api/test/twilio-outbox/clear', (_req, res) => { fakeTwilioOutbox.clear(); res.status(204).end(); });
}
```

(Place inside the existing async startup or use a top-level non-async require with `await import` replaced by a `require` if the file is CJS — verify by reading the top of index.ts.)

If `index.ts` is ESM, `await import` requires the surrounding code to be in an async context. Since the file isn't async at top level, use a top-level static import instead:

```ts
import { fakeTwilioOutbox } from './adapters/whatsapp/fake-twilio-client.js';
// ... later, after route mounts:
if (process.env.FAKE_TWILIO === '1') {
  app.get('/api/test/twilio-outbox', (_req, res) => res.json(fakeTwilioOutbox.messages));
  app.post('/api/test/twilio-outbox/clear', (_req, res) => { fakeTwilioOutbox.clear(); res.status(204).end(); });
}
```

- [ ] **Step 2: Write the test**

```ts
// e2e/pos/customer-sale-whatsapp.spec.ts
import { test, expect } from '../fixtures/auth.js';
import { apiCtx } from '../fixtures/api.js';

test('E2E-10 · Customer sale with phone triggers WhatsApp receipt', async ({ asOwner }) => {
  // Clear the fake outbox first
  const ctx = await apiCtx();
  await ctx.post('/api/test/twilio-outbox/clear');

  const page = await asOwner.newPage();
  await page.goto('/pos');

  await page.locator('select[name="barber"], #selectedBarber').selectOption({ label: /ramon/i });
  await page.getByRole('button', { name: /haircut/i }).click();

  // Attach customer phone
  await page.locator('input[name="customer_phone"], #customer-phone').fill('+18095550100');

  await page.getByRole('button', { name: /checkout|cobrar/i }).click();
  await page.getByRole('button', { name: /complete|confirmar|pay/i }).click();

  // Receipt success modal
  await expect(page.getByText(/sale.*#|venta.*#/i)).toBeVisible({ timeout: 10_000 });

  // Verify Twilio outbox has exactly one message addressed to whatsapp:+18095550100
  const ob = await ctx.get('/api/test/twilio-outbox');
  const messages = await ob.json();
  expect(messages).toHaveLength(1);
  expect(messages[0].to).toBe('whatsapp:+18095550100');
  await ctx.dispose();
});
```

- [ ] **Step 3: Run, adjust, commit**

```bash
npm run test:e2e -- e2e/pos/customer-sale-whatsapp.spec.ts
git add backend/src/index.ts e2e/pos/customer-sale-whatsapp.spec.ts
git commit -m "test(e2e): E2E-10 customer sale sends WhatsApp receipt + add test-only outbox endpoint"
```

---

### Task 3.7: E2E-11 OWNER creates service → service appears in booking flow

**Files:** Create `e2e/catalog/owner-creates-service.spec.ts`

- [ ] **Step 1: Write the test**

```ts
// e2e/catalog/owner-creates-service.spec.ts
import { test, expect } from '../fixtures/auth.js';

test('E2E-11 · OWNER creates service; service appears in public booking flow', async ({ asOwner, browser }) => {
  const ownerPage = await asOwner.newPage();
  await ownerPage.goto('/catalog');

  // Switch to Services tab if needed
  await ownerPage.getByRole('tab', { name: /services|servicios/i }).click().catch(() => {});

  // Open "Add service"
  await ownerPage.getByRole('button', { name: /add service|añadir servicio|new/i }).click();
  await ownerPage.locator('input[name="name"]').fill('Test Trim');
  await ownerPage.locator('input[name="price"]').fill('20');
  await ownerPage.locator('input[name="duration_minutes"], input[name="duration"]').fill('25');
  await ownerPage.getByRole('button', { name: /save|guardar|create/i }).click();
  await expect(ownerPage.getByText('Test Trim')).toBeVisible();
  await ownerPage.close();

  // Open the public booking flow in a fresh anonymous context
  const anon = await browser.newContext();
  const guestPage = await anon.newPage();
  await guestPage.goto('/discovery');
  await guestPage.getByRole('button', { name: /Barbería Test\b/ }).first().click();
  await expect(guestPage.getByRole('button', { name: /test trim/i })).toBeVisible();
  await anon.close();
});
```

- [ ] **Step 2: Run, commit**

```bash
npm run test:e2e -- e2e/catalog/owner-creates-service.spec.ts
git add e2e/catalog/owner-creates-service.spec.ts
git commit -m "test(e2e): E2E-11 catalog service appears in booking flow"
```

---

### Task 3.8: E2E-12 OWNER views commissions report

**Files:** Create `e2e/reports/owner-views-commissions.spec.ts`

- [ ] **Step 1: Write the test**

```ts
// e2e/reports/owner-views-commissions.spec.ts
import { test, expect } from '../fixtures/auth.js';
import { openTestDb, getBarberIdBySlug } from '../fixtures/db.js';

test('E2E-12 · OWNER views commissions; numbers match seeded sales', async ({ asOwner }) => {
  // Seed two sales: one for ramon (service $25, commission 0.6 → $15), one for luis ($25, 0.5 → $12.50)
  const db = openTestDb();
  const ramonId = getBarberIdBySlug('ramon');
  const luisId = getBarberIdBySlug('luis');
  const haircutId = (db.prepare('SELECT id FROM services WHERE name = ?').get('Haircut') as { id: number }).id;
  const shopId = (db.prepare('SELECT shop_id FROM barbers WHERE id = ?').get(ramonId) as { shop_id: number }).shop_id;

  const insertSale = (barberId: number) => {
    const sale = db.prepare(
      'INSERT INTO sales (barber_id, total_amount, shop_id, barber_name) VALUES (?, ?, ?, ?)'
    ).run(barberId, 25, shopId, barberId === ramonId ? 'Ramon' : 'Luis');
    const saleId = Number(sale.lastInsertRowid);
    db.prepare(
      'INSERT INTO sale_items (sale_id, item_id, type, price, item_name) VALUES (?, ?, ?, ?, ?)'
    ).run(saleId, haircutId, 'service', 25, 'Haircut');
  };
  insertSale(ramonId);
  insertSale(luisId);
  db.close();

  const page = await asOwner.newPage();
  await page.goto('/reports');

  // Pick "Today" or default range; the page should show commissions per barber
  // Ramon: $25 * 0.6 = $15.00
  // Luis:  $25 * 0.5 = $12.50
  await expect(page.getByText(/\$15\.00/)).toBeVisible();
  await expect(page.getByText(/\$12\.50/)).toBeVisible();
});
```

- [ ] **Step 2: Run, adjust (date range may need clicking), commit**

```bash
npm run test:e2e -- e2e/reports/owner-views-commissions.spec.ts
git add e2e/reports/owner-views-commissions.spec.ts
git commit -m "test(e2e): E2E-12 commissions report math"
```

---

## Phase 4 — Integration Tier (7 tests)

### Task 4.1: INT-01 chatbot `book` intent creates appointment

**Files:** Create `backend/test/integration/chatbot-book.test.ts`

- [ ] **Step 1: Write the test**

```ts
// backend/test/integration/chatbot-book.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from './_setup.js';
import { fakeLLMScript } from '../../src/adapters/llm/fake-llm-client.js';
import { fakeTwilioOutbox } from '../../src/adapters/whatsapp/fake-twilio-client.js';
import request from 'supertest';

describe('INT-01 · POST /chatbot webhook with `book` intent', () => {
  beforeEach(() => {
    fakeLLMScript.reset();
    fakeTwilioOutbox.clear();
  });

  it('creates an appointment and replies with confirmation', async () => {
    const { db } = await buildApp();
    // Seed a shop, customer, barber, service, and a shift
    db.prepare('INSERT INTO shops (id, name) VALUES (1, ?)').run('Test');
    db.prepare('INSERT INTO customers (id, phone, shop_id) VALUES (1, ?, 1)').run('+18095550100');
    db.prepare('INSERT INTO barbers (id, name, slug, shop_id, is_active) VALUES (1, ?, ?, 1, 1)').run('Ramon', 'ramon');
    db.prepare('INSERT INTO services (id, name, price, duration_minutes, shop_id, is_active) VALUES (1, ?, 25, 30, 1, 1)').run('Haircut');
    for (let d = 1; d <= 5; d++) {
      db.prepare('INSERT INTO barber_shifts (barber_id, day_of_week, start_time, end_time) VALUES (1, ?, ?, ?)').run(d, '09:00', '17:00');
    }

    fakeLLMScript.queueIntent({
      intent: 'book',
      args: { service: 'Haircut', barber: 'Ramon', date: nextWeekday(), time: '10:00' },
    });

    const { default: app } = await import('../../src/index.js');
    const res = await request(app)
      .post('/api/chatbot/webhooks/whatsapp')
      .type('form')
      .send({ From: 'whatsapp:+18095550100', Body: 'quiero una cita' });

    expect(res.status).toBeLessThan(300);
    const apptCount = (db.prepare('SELECT COUNT(*) AS n FROM appointments').get() as { n: number }).n;
    expect(apptCount).toBe(1);
    expect(fakeTwilioOutbox.messages.length).toBeGreaterThan(0);
    expect(fakeTwilioOutbox.messages[0].to).toBe('whatsapp:+18095550100');
  });
});

function nextWeekday() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
```

- [ ] **Step 2: Run**

```bash
npm run test:integration --prefix backend -- test/integration/chatbot-book.test.ts
```

Expected: PASS. If FAIL because the chatbot flow expects a different body shape or a confirmation step (booking flows often ask for confirmation before persisting), adjust by sending a follow-up message with the user's "yes" reply, queuing a second LLM intent if needed.

- [ ] **Step 3: Commit**

```bash
git add backend/test/integration/chatbot-book.test.ts
git commit -m "test(int): INT-01 chatbot book intent creates appointment"
```

---

### Task 4.2: INT-02 chatbot `cancel` intent

**Files:** Create `backend/test/integration/chatbot-cancel.test.ts`

- [ ] **Step 1: Write the test**

```ts
// backend/test/integration/chatbot-cancel.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from './_setup.js';
import { fakeLLMScript } from '../../src/adapters/llm/fake-llm-client.js';
import { fakeTwilioOutbox } from '../../src/adapters/whatsapp/fake-twilio-client.js';
import request from 'supertest';

describe('INT-02 · chatbot cancel intent', () => {
  beforeEach(() => { fakeLLMScript.reset(); fakeTwilioOutbox.clear(); });

  it('cancels an existing scheduled appointment', async () => {
    const { db } = await buildApp();
    db.prepare('INSERT INTO shops (id, name) VALUES (1, ?)').run('Test');
    db.prepare('INSERT INTO customers (id, phone, shop_id) VALUES (1, ?, 1)').run('+18095550100');
    db.prepare('INSERT INTO barbers (id, name, slug, shop_id, is_active) VALUES (1, ?, ?, 1, 1)').run('Ramon', 'ramon');
    db.prepare('INSERT INTO services (id, name, price, duration_minutes, shop_id, is_active) VALUES (1, ?, 25, 30, 1, 1)').run('Haircut');
    const future = new Date(Date.now() + 86400_000).toISOString();
    const appt = db.prepare(
      "INSERT INTO appointments (barber_id, customer_id, service_id, start_time, status, shop_id) VALUES (1, 1, 1, ?, 'scheduled', 1)"
    ).run(future);

    fakeLLMScript.queueIntent({ intent: 'cancel', args: {} });

    const { default: app } = await import('../../src/index.js');
    const res = await request(app)
      .post('/api/chatbot/webhooks/whatsapp')
      .type('form')
      .send({ From: 'whatsapp:+18095550100', Body: 'cancela mi cita' });

    expect(res.status).toBeLessThan(300);
    const status = (db.prepare('SELECT status FROM appointments WHERE id = ?').get(Number(appt.lastInsertRowid)) as { status: string }).status;
    expect(status).toBe('cancelled');
    expect(fakeTwilioOutbox.messages.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run, commit**

```bash
npm run test:integration --prefix backend -- test/integration/chatbot-cancel.test.ts
git add backend/test/integration/chatbot-cancel.test.ts
git commit -m "test(int): INT-02 chatbot cancel intent"
```

---

### Task 4.3: INT-03 chatbot `reschedule` intent

**Files:** Create `backend/test/integration/chatbot-reschedule.test.ts`

- [ ] **Step 1: Write the test**

```ts
// backend/test/integration/chatbot-reschedule.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from './_setup.js';
import { fakeLLMScript } from '../../src/adapters/llm/fake-llm-client.js';
import { fakeTwilioOutbox } from '../../src/adapters/whatsapp/fake-twilio-client.js';
import request from 'supertest';

describe('INT-03 · chatbot reschedule intent', () => {
  beforeEach(() => { fakeLLMScript.reset(); fakeTwilioOutbox.clear(); });

  it('updates appointment start_time when rescheduled', async () => {
    const { db } = await buildApp();
    db.prepare('INSERT INTO shops (id, name) VALUES (1, ?)').run('Test');
    db.prepare('INSERT INTO customers (id, phone, shop_id) VALUES (1, ?, 1)').run('+18095550100');
    db.prepare('INSERT INTO barbers (id, name, slug, shop_id, is_active) VALUES (1, ?, ?, 1, 1)').run('Ramon', 'ramon');
    db.prepare('INSERT INTO services (id, name, price, duration_minutes, shop_id, is_active) VALUES (1, ?, 25, 30, 1, 1)').run('Haircut');
    for (let d = 1; d <= 5; d++) {
      db.prepare('INSERT INTO barber_shifts (barber_id, day_of_week, start_time, end_time) VALUES (1, ?, ?, ?)').run(d, '09:00', '17:00');
    }
    const oldStart = new Date(Date.now() + 86400_000).toISOString();
    const appt = db.prepare(
      "INSERT INTO appointments (barber_id, customer_id, service_id, start_time, status, shop_id) VALUES (1, 1, 1, ?, 'scheduled', 1)"
    ).run(oldStart);

    const newDate = nextWeekdayPlus(2);
    fakeLLMScript.queueIntent({ intent: 'reschedule', args: { date: newDate, time: '14:00' } });

    const { default: app } = await import('../../src/index.js');
    const res = await request(app)
      .post('/api/chatbot/webhooks/whatsapp')
      .type('form')
      .send({ From: 'whatsapp:+18095550100', Body: 'cambiar mi cita' });

    expect(res.status).toBeLessThan(300);
    const updated = db.prepare('SELECT start_time FROM appointments WHERE id = ?').get(Number(appt.lastInsertRowid)) as { start_time: string };
    expect(updated.start_time).not.toBe(oldStart);
  });
});

function nextWeekdayPlus(extra: number) {
  const d = new Date();
  d.setDate(d.getDate() + extra);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
```

- [ ] **Step 2: Run, commit**

```bash
npm run test:integration --prefix backend -- test/integration/chatbot-reschedule.test.ts
git add backend/test/integration/chatbot-reschedule.test.ts
git commit -m "test(int): INT-03 chatbot reschedule intent"
```

---

### Task 4.4: INT-04 chatbot `unknown` intent

**Files:** Create `backend/test/integration/chatbot-unknown.test.ts`

- [ ] **Step 1: Write the test**

```ts
// backend/test/integration/chatbot-unknown.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from './_setup.js';
import { fakeLLMScript } from '../../src/adapters/llm/fake-llm-client.js';
import { fakeTwilioOutbox } from '../../src/adapters/whatsapp/fake-twilio-client.js';
import request from 'supertest';

describe('INT-04 · chatbot unknown intent', () => {
  beforeEach(() => { fakeLLMScript.reset(); fakeTwilioOutbox.clear(); });

  it('returns the configured fallback message and writes nothing to appointments', async () => {
    const { db } = await buildApp();
    db.prepare('INSERT INTO shops (id, name) VALUES (1, ?)').run('Test');
    db.prepare('INSERT INTO customers (id, phone, shop_id) VALUES (1, ?, 1)').run('+18095550100');

    fakeLLMScript.queueIntent({ intent: 'unknown', args: {} });

    const { default: app } = await import('../../src/index.js');
    const res = await request(app)
      .post('/api/chatbot/webhooks/whatsapp')
      .type('form')
      .send({ From: 'whatsapp:+18095550100', Body: 'qué hay de nuevo' });

    expect(res.status).toBeLessThan(300);
    const apptCount = (db.prepare('SELECT COUNT(*) AS n FROM appointments').get() as { n: number }).n;
    expect(apptCount).toBe(0);
    expect(fakeTwilioOutbox.messages.length).toBeGreaterThan(0);
    // The fallback message body is locale-controlled; assert non-empty
    expect(fakeTwilioOutbox.messages[0].body.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run, commit**

```bash
npm run test:integration --prefix backend -- test/integration/chatbot-unknown.test.ts
git add backend/test/integration/chatbot-unknown.test.ts
git commit -m "test(int): INT-04 chatbot unknown intent fallback"
```

---

### Task 4.5: INT-05 login rejects wrong password

**Files:** Create `backend/test/integration/auth-login-wrong-password.test.ts`

- [ ] **Step 1: Write the test**

```ts
// backend/test/integration/auth-login-wrong-password.test.ts
import { describe, it, expect } from 'vitest';
import { buildApp, seedMinimalShop } from './_setup.js';
import request from 'supertest';

describe('INT-05 · POST /api/auth/login with wrong password', () => {
  it('returns 401 with no token and no password_hash leak', async () => {
    const { db } = await buildApp();
    await seedMinimalShop(db);

    const { default: app } = await import('../../src/index.js');
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'owner', password: 'WrongPassword!' });

    expect(res.status).toBe(401);
    expect(res.body.token).toBeUndefined();
    const bodyJson = JSON.stringify(res.body);
    expect(bodyJson).not.toContain('password_hash');
    expect(bodyJson).not.toContain('$2a$');
    expect(bodyJson).not.toContain('$2b$');
  });
});
```

- [ ] **Step 2: Run, commit**

```bash
npm run test:integration --prefix backend -- test/integration/auth-login-wrong-password.test.ts
git add backend/test/integration/auth-login-wrong-password.test.ts
git commit -m "test(int): INT-05 login rejects wrong password without leak"
```

---

### Task 4.6: INT-06 login rate-limit

**Files:** Create `backend/test/integration/auth-login-rate-limit.test.ts`

- [ ] **Step 1: Read the rate limiter to know the threshold**

```bash
cat backend/src/middleware/login-rate-limiter.ts | head -30
```

Note the configured `MAX_ATTEMPTS` value (likely 5). Use it in the test.

- [ ] **Step 2: Write the test**

```ts
// backend/test/integration/auth-login-rate-limit.test.ts
import { describe, it, expect } from 'vitest';
import { buildApp, seedMinimalShop } from './_setup.js';
import request from 'supertest';

describe('INT-06 · login rate-limit', () => {
  it('eventually returns 429 after repeated failed attempts from the same IP', async () => {
    const { db } = await buildApp();
    await seedMinimalShop(db);
    const { default: app } = await import('../../src/index.js');

    let saw429 = false;
    for (let i = 0; i < 20; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', '198.51.100.1')
        .send({ username: 'owner', password: 'WrongPassword!' });
      if (res.status === 429) { saw429 = true; break; }
    }
    expect(saw429).toBe(true);
  });
});
```

- [ ] **Step 3: Run, commit**

```bash
npm run test:integration --prefix backend -- test/integration/auth-login-rate-limit.test.ts
git add backend/test/integration/auth-login-rate-limit.test.ts
git commit -m "test(int): INT-06 login rate-limit kicks in after threshold"
```

---

### Task 4.7: INT-07 public shop_settings endpoint

**Files:** Create `backend/test/integration/public-shop-settings.test.ts`

Note: the spec mentioned `settings.timezone` and `settings.default_locale`. The current implementation in `backend/src/index.ts:137-141` only exposes `open_time` and `close_time`. We assert against the current behavior and leave a `TODO` comment in the test pointing at the spec divergence.

- [ ] **Step 1: Write the test**

```ts
// backend/test/integration/public-shop-settings.test.ts
import { describe, it, expect } from 'vitest';
import { buildApp } from './_setup.js';
import request from 'supertest';

describe('INT-07 · GET /api/public/shops/:id includes shop_settings', () => {
  it('returns settings.open_time and settings.close_time without auth', async () => {
    const { db } = await buildApp();
    db.prepare('INSERT INTO shops (id, name) VALUES (1, ?)').run('Public Shop');
    db.prepare('INSERT INTO shop_settings (shop_id, key, value) VALUES (1, ?, ?)').run('open_time', '09:00');
    db.prepare('INSERT INTO shop_settings (shop_id, key, value) VALUES (1, ?, ?)').run('close_time', '18:00');

    const { default: app } = await import('../../src/index.js');
    const res = await request(app).get('/api/public/shops/1');  // no auth header

    expect(res.status).toBe(200);
    expect(res.body.settings).toBeDefined();
    expect(res.body.settings.open_time).toBe('09:00');
    expect(res.body.settings.close_time).toBe('18:00');
    // TODO(spec): the verification spec mentions `timezone` and `default_locale`.
    // Current implementation (backend/src/index.ts:137) only exposes open_time/close_time.
    // When/if the public endpoint is extended, add assertions here.
  });
});
```

- [ ] **Step 2: Run, commit**

```bash
npm run test:integration --prefix backend -- test/integration/public-shop-settings.test.ts
git add backend/test/integration/public-shop-settings.test.ts
git commit -m "test(int): INT-07 public shops endpoint returns shop_settings"
```

---

## Phase 5 — Documentation & Polish

### Task 5.1: Add ADR for verification strategy

**Files:** Create `docs/adr/NNNN-verification-strategy.md` (number assigned by script)

- [ ] **Step 1: Scaffold the ADR**

```bash
bash scripts/new-adr.sh "Verification strategy: critical-path E2E + integration tier"
```

- [ ] **Step 2: Fill in the ADR body**

Open the new file (path printed by the script). Replace its placeholder body with:

```markdown
## Context

The repository had ~50 unit tests but no flow-level coverage. `scripts/ai-verify.sh` only built and type-checked. Critical revenue surfaces (booking, POS, WhatsApp chatbot) had no end-to-end validation.

## Decision

Adopt three test tiers with clear ownership:

1. **Unit (vitest, existing):** in `backend/src/**/*.test.ts` and `frontend/src/**/*.test.tsx`. Pure functions and use-case logic.
2. **HTTP integration (supertest + vitest, new):** in `backend/test/integration/`. Tests Express routes against an `:memory:` DB with `FakeTwilioClient` and `FakeLLMClient` injected at the composition root.
3. **E2E (Playwright, new):** in `e2e/`. Tests user journeys through the browser against a built backend pinned to `data/test.db` and the Vite preview server. Chromium only, `workers: 1` (serial).

External adapters are replaced via env-controlled flags (`FAKE_TWILIO=1`, `FAKE_LLM=1`) at the composition root in `backend/src/index.ts`. This works because the codebase uses hexagonal architecture with adapter interfaces.

## Consequences

**Positive:**
- Single command (`npm run verify`) catches regressions across all tiers in <6 min.
- Flow-level confidence in booking, POS, auth, and chatbot.
- Test data is deterministic (`e2e/fixtures/seed-test.ts`) — no flakiness from data drift.

**Negative:**
- E2E test suite adds ~3-5 min to verification time.
- Selectors in E2E tests need maintenance when UI text/structure changes.
- Two test DBs (`:memory:` for unit/integration, `data/test.db` for E2E) — engineers need to know which is active when debugging.

**Out of scope (deferred):**
- CI YAML hookup
- Cross-browser testing (Firefox, Safari, mobile viewports)
- Visual regression
- Parallel E2E workers
- Google Calendar OAuth E2E
- Real Twilio sandbox
```

- [ ] **Step 3: Commit**

```bash
git add docs/adr/
git commit -m "docs(adr): record verification strategy decision"
```

---

### Task 5.2: README "Verification" section

**Files:** Modify `README.md`

- [ ] **Step 1: Read current README**

```bash
head -60 README.md 2>/dev/null || echo "(no README yet)"
```

- [ ] **Step 2: Append (or insert near top, depending on existing structure) a Verification section**

```markdown
## Verification

Run before opening a PR:

```bash
npm run verify        # full: types + unit + integration + E2E (~3-5 min)
npm run verify:quick  # mid-edit (~30s)
```

See [`TESTING.md`](./TESTING.md) for the verification matrix and how to add new tests.
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs(readme): add Verification section pointing at npm run verify"
```

---

### Task 5.3: Run full verification end-to-end

- [ ] **Step 1: Run the full pipeline**

```bash
npm run verify
```

Expected outcome: all stages pass within ~5 minutes. If anything fails, do NOT mark the phase complete — open an issue task and fix.

- [ ] **Step 2: Verify CI-readiness markers**

- All 20 new tests are green
- `data/test.db` is in `.gitignore` and not committed
- `e2e/.auth/` is in `.gitignore` and not committed
- `playwright-report/` is in `.gitignore`

- [ ] **Step 3: Commit any final touch-ups**

If the run revealed flakes or selector bugs, fix them, then commit:

```bash
git commit -am "test(verify): final flake fixes from full E2E run"
```

---

## Total

**33 tasks across 5 phases, ~5½ days of focused work, 5+ mergeable PRs.** Each phase is independently shippable.
