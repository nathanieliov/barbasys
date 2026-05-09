# Architecture Decision Record (ADR)

## Title
Verification strategy: critical-path E2E + integration tier

## Status
Accepted

## Context

The repository had ~50 unit tests but no flow-level coverage. `scripts/ai-verify.sh` only built and type-checked. Critical revenue surfaces (booking, POS, WhatsApp chatbot) had no end-to-end validation.

## Decision

Adopt three test tiers with clear ownership:

1. **Unit (vitest, existing):** in `backend/src/**/*.test.ts` and `frontend/src/**/*.test.tsx`. Pure functions and use-case logic.
2. **HTTP integration (supertest + vitest, new):** in `backend/test/integration/`. Tests Express routes against an `:memory:` DB with `FakeTwilioClient` and `FakeLLMClient` injected at the composition root.
3. **E2E (Playwright, new):** in `e2e/`. Tests user journeys through the browser against a built backend pinned to `data/test.db` and the Vite preview server. Chromium only, `workers: 1` (serial).

External adapters are replaced via env-controlled flags (`FAKE_TWILIO=1`, `FAKE_LLM=1`) at the composition root in `backend/src/index.ts`. This works because the codebase uses hexagonal architecture with adapter interfaces.

The E2E tier uses a custom orchestrator (`scripts/e2e-run.sh`) instead of Playwright's built-in `webServer` for the backend. Reason: under Playwright's webServer spawn, better-sqlite3's long-lived shared connection consistently failed writes with "attempt to write a readonly database" — same code, same env, same DB file works fine when invoked directly. Root cause was not identified, so we sidestep it: the bash script runs the seed, starts the backend out-of-band, polls until ready, then invokes Playwright. Vite preview (frontend) still runs under Playwright's webServer (no SQLite involved).

## Consequences

**Positive:**
- Single command (`npm run verify`) catches regressions across all tiers.
- Flow-level confidence in booking, POS, auth, and chatbot.
- Test data is deterministic (`e2e/fixtures/seed-test.ts`) — no flakiness from data drift.

**Negative:**
- E2E test suite adds time to verification (~few minutes for 13 tests).
- Selectors in E2E tests need maintenance when UI text/structure changes.
- Two test DBs (`:memory:` for unit/integration, `data/test.db` for E2E) — engineers need to know which is active when debugging.
- The Playwright webServer SQLite issue remains an unsolved mystery; we work around it with the bash orchestrator.

**Out of scope (deferred):**
- CI YAML hookup
- Cross-browser testing (Firefox, Safari, mobile viewports)
- Visual regression
- Parallel E2E workers
- Google Calendar OAuth E2E
- Real Twilio sandbox

## Bugs found during implementation (worth follow-up)

1. **`vite preview` doesn't honor `server.proxy`** — fixed by adding a `preview.proxy` block in `frontend/vite.config.ts`.
2. **`/api/auth/me` lazy customer-create races** under concurrent E2E load — masked by pre-linking customer rows in the seed.
3. **`express.urlencoded()` is missing** in `backend/src/index.ts` — Twilio sends form-encoded data and would 500 in production. Tests sidestep with JSON. **Open issue.**
4. **First-time guest customer flow** requires fullname + birthday after OTP (`requires_profile_completion`) — handled in `e2e/booking/guest-otp-booking.spec.ts`.
5. **`EMAIL_PASS` committed in plaintext** in root `.env` (Gmail App Password). Worth rotating + gitignoring.
