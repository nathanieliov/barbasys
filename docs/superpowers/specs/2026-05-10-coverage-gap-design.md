# Coverage Gap — Design Spec

**Date:** 2026-05-10
**Scope:** Frontend coverage reporting, E2E verification, unit tests to 80%
**Approach:** Sequential, coverage-gated (Approach A)

---

## Goal

Close the frontend test coverage gap. Backend has 290 tests and is well-covered. Frontend has 42 tests across 7 files with no coverage reporting and ~20 pages, 13 components, and 2 hooks that lack meaningful tests. E2E suite (13 specs) exists but has never been verified green after recent UI changes.

---

## Phase 1 — Coverage Reporting

**Goal:** Measure the baseline before writing any new tests.

**Changes:**
- Add `@vitest/coverage-v8` to `frontend/devDependencies`
- Extend the `test` block in `frontend/vite.config.ts`:
  ```ts
  coverage: {
    provider: 'v8',
    include: ['src/**'],
    exclude: ['src/**/*.test.*', 'src/setupTests.ts'],
  }
  ```
- Add to `frontend/package.json` scripts:
  - `"test:coverage"` → `vitest run --coverage`
  - `"test:coverage:ui"` → `vitest --coverage --ui`
- Add to root `package.json`:
  - `"test:coverage"` → `npm run test:coverage --prefix frontend`

No threshold enforcement in this phase — measurement only. The 80% gate is added at the end of Phase 3.

**Success criteria:** `npm run test:coverage` prints a coverage table showing line/function/branch % per file.

---

## Phase 2 — E2E Verification & Fixes

**Goal:** All 13 existing E2E specs pass cleanly against a seeded test DB.

**Specs to verify (in `e2e/`):**
```
auth/owner-login.spec.ts
auth/barber-login.spec.ts
auth/customer-signup.spec.ts
auth/forgot-password.spec.ts
appointments/owner-creates-appointment.spec.ts
appointments/owner-cancels-appointment.spec.ts
booking/any-barber-booking.spec.ts
booking/guest-otp-booking.spec.ts
catalog/owner-creates-service.spec.ts
multi-shop/owner-switches-shop.spec.ts
pos/walk-in-sale.spec.ts
pos/customer-sale-whatsapp.spec.ts
reports/owner-views-commissions.spec.ts
```

**Runner:** `bash scripts/e2e-run.sh` (builds backend+frontend, seeds test DB, starts backend out-of-band, runs Playwright against Vite preview on :4173).

**Fix strategy per failure type:**
- Selector drift → update locator to match current DOM
- Timing issues → add `waitFor` / `expect(locator).toBeVisible()` before assertions
- Seed gaps → add missing data to `e2e/fixtures/seed-test.ts`
- Auth state leakage → ensure each spec re-authenticates or uses isolated storage state

**Rule:** No `.skip()`. Every spec must pass.

**After all 13 pass:**
- Add `"test:e2e"` to root `package.json` → `bash scripts/e2e-run.sh`

**Success criteria:** `bash scripts/e2e-run.sh` exits 0 with all 13 specs green.

---

## Phase 3 — Unit Tests to 80%

**Goal:** Frontend line/function/branch coverage ≥ 80%, enforced by Vitest threshold.

**Prioritization order (driven by coverage report output):**

1. **Hooks** (`useAuth.tsx`, `useSettings.tsx`)
   - Test with `renderHook` from `@testing-library/react`
   - Cover: initial state, login/logout side effects, settings fetch/update

2. **Reusable components** (`Modal`, `Button`, `Card`, `ConfirmDialog`, `Toast`, `PasswordInput`, `Stepper`, `Chip`, `EmptyState`, `KpiCard`, `Avatar`, `AppTopBar`, `ProtectedRoute`)
   - Isolated: mock `apiClient`, no routing needed for most
   - Cover: prop variations, user interactions, conditional rendering

3. **Pages** (only those flagged below threshold by the coverage report)
   - Follow existing patterns: mock `apiClient`, wrap in `MemoryRouter + AuthProvider + SettingsProvider`
   - Reference: `BookingFlow.test.tsx`, `POS.test.tsx`, `Schedule.test.tsx`

**Stop condition:** Stop writing tests the moment overall coverage crosses 80%. Do not write tests for already-covered code.

**Threshold enforcement (added after crossing 80%):**
```ts
coverage: {
  provider: 'v8',
  include: ['src/**'],
  exclude: ['src/**/*.test.*', 'src/setupTests.ts'],
  thresholds: {
    lines: 80,
    functions: 80,
    branches: 80,
  },
}
```

**Success criteria:** `npm run test:coverage` exits 0 with lines/functions/branches all ≥ 80%.

---

## File Changes Summary

| File | Change | Phase |
|---|---|---|
| `frontend/package.json` | Add `test:coverage`, `test:coverage:ui` scripts | 1 |
| `frontend/vite.config.ts` | Add `coverage` block (no threshold) | 1 |
| `package.json` (root) | Add `test:coverage`, `test:e2e` scripts | 1 + 2 |
| `e2e/**/*.spec.ts` | Fix failures (selectors, timing, seed gaps) | 2 |
| `e2e/fixtures/seed-test.ts` | Add missing test data if needed | 2 |
| `frontend/src/**/*.test.tsx` | New unit tests for hooks, components, pages | 3 |
| `frontend/vite.config.ts` | Add `thresholds` to coverage block | 3 |

---

## Out of Scope

- Backend coverage (already well-tested)
- New frontend features
- E2E specs for flows not yet implemented
- Coverage for `frontend/src/locales/` or asset files
