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
| Run one E2E spec | `npm run test:e2e -- e2e/path/to.spec.ts` | varies |

## E2E architecture

The E2E tier uses a custom orchestrator (`scripts/e2e-run.sh`) instead of Playwright's built-in `webServer` for the backend. The reason: under Playwright's webServer spawn, better-sqlite3's long-lived shared connection consistently failed writes with "attempt to write a readonly database" — same code, same env, same DB file works fine when invoked directly. Root cause was not identified, so we sidestep it: the bash script runs the seed, starts the backend out-of-band, polls until ready, then invokes Playwright. Vite preview (frontend) still runs under Playwright's webServer (no SQLite involved).

`scripts/e2e-run.sh` writes backend logs to `.e2e-run/backend.log` (gitignored) — useful for debugging test failures.

## Test data (E2E)

`e2e/fixtures/seed-test.ts` wipes `data/test.db` and seeds a deterministic dataset on every E2E run:

- **Shop A** (`Barbería Test`): owner=`owner`, manager=`manager`, barbers `ramon`/`luis`, customer with phone `+18095550100`, services Haircut/Beard Trim/Combo, products Pomade/Shampoo
- **Shop B** (`Barbería Test 2`): owner=`owner_b`, barber `pedro`, service "Shop B Cut"

All test users use password `TestPass123!`.

The seed pre-links staff and customer users to dedicated customer rows so `/api/auth/me` doesn't hit a racy lazy-create path. (Discovered in E2E-01 implementation.)

## How adapters get faked

The composition root in `backend/src/index.ts` reads `FAKE_TWILIO=1` / `FAKE_LLM=1` env flags and injects `FakeTwilioClient` / `FakeLLMClient` instead of real adapters. The fakes live at:

- `backend/src/adapters/whatsapp/fake-twilio-client.ts` — exposes `fakeTwilioOutbox` (records all outbound messages)
- `backend/src/adapters/llm/fake-llm-client.ts` — exposes `fakeLLMScript.queueIntent(...)` / `queueAnswer(...)` for scripted responses

`scripts/e2e-run.sh` always starts the backend with both flags on.

## Adding a new E2E test

1. Create `e2e/<area>/<name>.spec.ts`
2. For authenticated flows, use the auth fixture: `import { test, expect } from '../fixtures/auth.js'` — gives you `asOwner`, `asBarber`, `asCustomer`, `ownerToken`
3. For setup HTTP calls, use `e2e/fixtures/api.js`. For read-only DB verification (asserting state changes), use `e2e/fixtures/db.js`
4. Run interactively first: `npm run test:e2e:ui -- e2e/<area>/<name>.spec.ts`
5. Default frontend locale is `es-DO` — selectors should match Spanish UI text. Use both-locale regexes for resilience: `/sign in|iniciar|ingresar/i`
6. Currency renders as `RD$XX.XX` (e.g., `/RD\$\s*37\.00/`)
7. Aim for 3 consecutive passes before committing

## Adding a new HTTP integration test

(Phase 4 will populate this section with examples.)

1. Create `backend/test/integration/<name>.test.ts`
2. Import `buildApp, seedMinimalShop` from `_setup.js`
3. `buildApp()` returns `{ db, app }` with truncated tables
4. Use supertest to drive the app; assert against the response and (optionally) DB state
5. Run: `npm run test:integration --prefix backend`

## Troubleshooting

- **Playwright says ports busy:** another `npm run dev` is running. Stop it.
- **`data/test.db` locked:** a previous run crashed mid-write. The next `npm run test:e2e` will clean it via `scripts/e2e-run.sh`.
- **OTP not auto-filling in tests:** confirm the backend was started with `EMAIL_USER=''` (the e2e-run.sh script does this). Without it, `SendOTP.execute()` doesn't return `devCode`.
- **Backend crash during E2E:** read `.e2e-run/backend.log`.
- **First-time guest booking redirects to a profile-completion modal:** that's expected — `VerifyOTP` requires fullname + birthday for new customer users. Test fixtures handle this in `e2e/booking/guest-otp-booking.spec.ts`.

## Known gotchas (from implementation)

These were discovered during Phase 2 — record here so future contributors don't relearn them:

1. **The Sidebar contains a shop-switcher `<select>`** for owner users — when picking selects in tests, scope or index your locator (don't rely on `select` being unique).
2. **`GET /api/appointments` defaults to "today"** — pass `?date=YYYY-MM-DD` to query other dates.
3. **SQLite returns `start_time` with a space separator** (`2026-05-12 10:00:00`), not ISO `T`. Match with `/[ T]10:00/`.
4. **Backend writes (`vite preview` proxy)**: `frontend/vite.config.ts` has a `preview.proxy` block mirroring `server.proxy`. Required for E2E because `vite preview` doesn't honor `server.proxy`.
5. **Seed schema bootstrap**: `e2e/fixtures/seed-test.ts` spawns a child `npx tsx` process to import `backend/src/db.js` and run migrations, then opens its own connection to insert the deterministic seed. Order matters — backend must start AFTER seed completes.
