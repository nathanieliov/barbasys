# Booking Flow — Location Step Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dead-code Location step in `BookingFlow.tsx` with a real shop-info confirmation card that always renders as Step 2 of a 5-step flow.

**Architecture:** Extend `GET /api/public/shops/:id` to return `shop_settings.open_time / close_time` alongside the existing `shop`/`services`/`barbers`. Frontend simplifies the conditional `STEP` definition to always include LOCATION, replaces the placeholder map with a structured card showing name, address, phone, hours, and a "Get directions" link to Google Maps. Existing booking-flow tests get an extra Continue click for the new step.

**Tech Stack:** Express + better-sqlite3 backend; React 18 + Vite frontend with vanilla CSS + design tokens; vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-05-07-booking-location-step-design.md`

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `backend/src/index.ts` | Modify | Extend `GET /api/public/shops/:id` to include `settings: { open_time, close_time }` |
| `frontend/src/locales/en-US.json` | Modify | 2 new `booking.*` keys |
| `frontend/src/locales/es-DO.json` | Modify | 2 new `booking.*` keys |
| `frontend/src/pages/BookingFlow.tsx` | Modify | Always render LOCATION step at index 2, new confirmation card render, new `settings` state, capture from response |
| `frontend/src/pages/BookingFlow.test.tsx` | Modify | Add Continue click for the inserted Location step in existing tests; add 3 new tests for Location content |

---

### Task 1: Extend `GET /api/public/shops/:id` to return shop settings

**Files:**
- Modify: `backend/src/index.ts:132-141`

- [ ] **Step 1: Locate the existing handler**

```bash
grep -n "/api/public/shops/:id" backend/src/index.ts
```
Expected: line 132.

- [ ] **Step 2: Replace the handler body**

Find:
```ts
app.get('/api/public/shops/:id', (req, res) => {
  try {
    const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(req.params.id);
    const services = db.prepare('SELECT * FROM services WHERE shop_id = ? AND is_active = 1').all(req.params.id);
    const barbers = db.prepare('SELECT * FROM barbers WHERE shop_id = ? AND is_active = 1').all(req.params.id);
    res.json({ shop, services, barbers });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
```

Replace with:
```ts
app.get('/api/public/shops/:id', (req, res) => {
  try {
    const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(req.params.id);
    const services = db.prepare('SELECT * FROM services WHERE shop_id = ? AND is_active = 1').all(req.params.id);
    const barbers = db.prepare('SELECT * FROM barbers WHERE shop_id = ? AND is_active = 1').all(req.params.id);
    const settingRows = db.prepare("SELECT key, value FROM shop_settings WHERE shop_id = ? AND key IN ('open_time', 'close_time')").all(req.params.id) as { key: string; value: string }[];
    const settings = {
      open_time: settingRows.find(r => r.key === 'open_time')?.value ?? null,
      close_time: settingRows.find(r => r.key === 'close_time')?.value ?? null,
    };
    res.json({ shop, services, barbers, settings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
```

- [ ] **Step 3: Verify build**

```bash
bash scripts/ai-verify.sh 2>&1 | grep -c "error TS"
```
Expected: 0.

- [ ] **Step 4: Run all backend tests (no regression)**

```bash
npm test --prefix backend 2>&1 | tail -3
```
Expected: 284 passing.

- [ ] **Step 5: Smoke test the endpoint manually (optional but recommended)**

Quick check via curl in a separate terminal (start dev server first if not running):
```bash
curl -s http://localhost:3000/api/public/shops/1 | python3 -c "import sys,json; d = json.load(sys.stdin); print('settings present:', 'settings' in d, '— keys:', list(d.get('settings', {}).keys()))"
```
Expected: `settings present: True — keys: ['open_time', 'close_time']`. If the dev server isn't running, skip this — Step 4's tests are sufficient for the type/build check.

- [ ] **Step 6: Commit**

```bash
git add backend/src/index.ts
git commit -m "feat(api): include shop_settings in /public/shops/:id response

Adds open_time and close_time from shop_settings to the existing
public shop endpoint so the booking flow can show shop hours.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Add i18n keys

**Files:**
- Modify: `frontend/src/locales/en-US.json`
- Modify: `frontend/src/locales/es-DO.json`

- [ ] **Step 1: Check whether keys already exist**

```bash
grep -n '"location_confirm_hint"\|"get_directions"' frontend/src/locales/en-US.json frontend/src/locales/es-DO.json
```
If a key already exists in the `booking` namespace of either file, do NOT add a duplicate.

- [ ] **Step 2: Locate the `booking` namespace**

```bash
grep -n '"booking":' frontend/src/locales/en-US.json
```

- [ ] **Step 3: Add to en-US.json**

Inside the `"booking": { ... }` block (preserving valid JSON — comma after the previous last key, no trailing comma after the last new key), add:

```json
    "location_confirm_hint": "Here's where your appointment will be.",
    "get_directions": "Get directions"
```

- [ ] **Step 4: Add to es-DO.json**

Inside the `"booking": { ... }` block, add the Spanish copy:

```json
    "location_confirm_hint": "Aquí es donde será tu cita.",
    "get_directions": "Cómo llegar"
```

- [ ] **Step 5: Verify JSON parses**

```bash
node -e "JSON.parse(require('fs').readFileSync('frontend/src/locales/en-US.json'))" && \
node -e "JSON.parse(require('fs').readFileSync('frontend/src/locales/es-DO.json'))" && \
echo OK
```
Expected: `OK`.

- [ ] **Step 6: Frontend tests still pass**

```bash
npm test --prefix frontend 2>&1 | tail -3
```
Expected: 38 passing.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/locales/en-US.json frontend/src/locales/es-DO.json
git commit -m "feat(i18n): booking location step keys

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 3: BookingFlow.tsx — always show LOCATION step + render confirmation card

**Files:**
- Modify: `frontend/src/pages/BookingFlow.tsx`

This is the largest change. It does three things in one TDD-less commit (the test updates land in Task 4):
1. Simplifies `STEP` and `STEP_LABELS` to unconditionally include LOCATION at index 2
2. Adds `settings` state and captures it from the shop fetch response
3. Replaces the placeholder Location step body with the confirmation card

- [ ] **Step 1: Update lucide-react imports**

```bash
grep -n "from 'lucide-react'" frontend/src/pages/BookingFlow.tsx | head -3
```

Find the existing `import { ... } from 'lucide-react';` line. Ensure it includes `MapPin`, `Phone`, `Clock`, `Navigation`. If any are missing, add them.

For example, if the existing line is:
```tsx
import { User, Calendar, CheckCircle, MapPin } from 'lucide-react';
```
Replace with:
```tsx
import { User, Calendar, CheckCircle, MapPin, Phone, Clock, Navigation } from 'lucide-react';
```

(Preserve the other names that were already imported.)

- [ ] **Step 2: Simplify the STEP definition**

Find the existing block (around line 205-215) that looks roughly like:
```tsx
const STEP_LABELS = hasShopId
  ? [t('nav.barbers', 'Barber'), t('nav.services', 'Service'), t('booking.date_time', 'Date & Time'), t('booking.confirm', 'Confirm')]
  : [t('nav.barbers', 'Barber'), t('nav.services', 'Service'), t('booking.location', 'Location'), t('booking.date_time', 'Date & Time'), t('booking.confirm', 'Confirm')];

const STEP = {
  BARBER: 0,
  SERVICE: 1,
  LOCATION: hasShopId ? -1 : 2,
  DATETIME: hasShopId ? 2 : 3,
  CONFIRM: hasShopId ? 3 : 4,
};
```

Replace with:
```tsx
const STEP_LABELS = [
  t('nav.barbers', 'Barber'),
  t('nav.services', 'Service'),
  t('booking.location', 'Location'),
  t('booking.date_time', 'Date & Time'),
  t('booking.confirm', 'Confirm'),
];

const STEP = {
  BARBER: 0,
  SERVICE: 1,
  LOCATION: 2,
  DATETIME: 3,
  CONFIRM: 4,
};
```

(`hasShopId` is no longer referenced. Remove its declaration too — search for `const hasShopId =` and delete that line.)

- [ ] **Step 3: Add `settings` state**

Find the existing `const [shop, setShop] = useState<any>(null);` line. Just below it, add:

```tsx
const [settings, setSettings] = useState<{ open_time: string | null; close_time: string | null } | null>(null);
```

- [ ] **Step 4: Capture settings from the fetch**

Find the `apiClient.get(\`/public/shops/${shopId}\`).then(...)` call. Inside the `.then(res => { ... })`, where `setShop(res.data.shop)` is called, add right after it:

```tsx
setSettings(res.data.settings ?? null);
```

- [ ] **Step 5: Update step gating**

Find `canAdvance()` (around line 280-290). It currently has a guarded check:
```tsx
if (STEP.LOCATION >= 0 && step === STEP.LOCATION) return !!shopId;
```

Replace with:
```tsx
if (step === STEP.LOCATION) return !!shop;
```

(Use `!!shop` rather than `!!shopId` — the shop object loaded into state is the actual signal that the data is ready to display.)

- [ ] **Step 6: Replace the Location step body**

Find the existing Location step render (around line 494-511):
```tsx
{STEP.LOCATION >= 0 && step === STEP.LOCATION && (
  <>
    <h2 className="section-title" style={{ fontSize: 28, margin: '0 0 6px' }}>{t('booking.where_to', 'Where to?')}</h2>
    <p className="muted" style={{ margin: '0 0 22px', fontSize: 15 }}>{t('booking.location_hint', 'Choose a location near you.')}</p>
    <div className="option-grid">
      <OptionCard selected={!!shop} onClick={() => {}} style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ height: 130, background: 'repeating-linear-gradient(45deg,var(--surface-2),var(--surface-2) 8px,var(--surface-3) 8px,var(--surface-3) 16px)', borderRadius: 0, display: 'grid', placeItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>map placeholder</div>
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <MapPin size={15} />
            <div style={{ fontWeight: 600, fontSize: 16 }}>{shop?.name}</div>
          </div>
          <div className="muted" style={{ fontSize: 13 }}>{shop?.address}</div>
        </div>
      </OptionCard>
    </div>
  </>
)}
```

Replace with:
```tsx
{step === STEP.LOCATION && shop && (
  <>
    <h2 className="section-title" style={{ fontSize: 28, margin: '0 0 6px' }}>{t('booking.where_to', 'Where to?')}</h2>
    <p className="muted" style={{ margin: '0 0 22px', fontSize: 15 }}>{t('booking.location_confirm_hint', "Here's where your appointment will be.")}</p>

    <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, margin: 0 }}>
        {shop.name}
      </h3>

      {shop.address && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <MapPin size={18} style={{ color: 'var(--ink-3)', flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontSize: 15 }}>{shop.address}</span>
        </div>
      )}

      {shop.phone && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Phone size={18} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
          <a href={`tel:${shop.phone}`} style={{ fontSize: 15, color: 'var(--ink)', textDecoration: 'none' }}>
            {shop.phone}
          </a>
        </div>
      )}

      {(settings?.open_time || settings?.close_time) && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Clock size={18} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
          <span style={{ fontSize: 15 }}>
            {settings.open_time ?? '—'} – {settings.close_time ?? '—'}
          </span>
        </div>
      )}

      {shop.address && (
        <a
          className="btn btn-ghost btn-sm"
          href={`https://maps.google.com/?q=${encodeURIComponent(shop.address)}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ alignSelf: 'flex-start', marginTop: 4, textDecoration: 'none', display: 'inline-flex', gap: 6, alignItems: 'center' }}
        >
          <Navigation size={14} /> {t('booking.get_directions', 'Get directions')}
        </a>
      )}
    </div>
  </>
)}
```

- [ ] **Step 7: Verify build**

```bash
bash scripts/ai-verify.sh 2>&1 | grep -c "error TS"
```
Expected: 0.

- [ ] **Step 8: Run frontend tests**

```bash
npm test --prefix frontend 2>&1 | tail -10
```

**Expected: SOME TESTS WILL FAIL** — the existing BookingFlow tests advance through 4 steps and now hit the Location step in the middle. Don't fix them yet — that's Task 4. Note the failing test count and proceed to commit.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/pages/BookingFlow.tsx
git commit -m "feat(booking): always show Location confirmation step

Removes the conditional that disabled the Location step when shopId
was in the route. Replaces the placeholder map card with a real
confirmation card showing shop name, address, phone, hours, and a
'Get directions' link to Google Maps.

Existing BookingFlow tests still need to be updated for the new
5-step flow — they fail as of this commit. Test fixes ship next.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Update existing `BookingFlow.test.tsx` for the 5-step flow

**Files:**
- Modify: `frontend/src/pages/BookingFlow.test.tsx`

The existing tests advance from Barber → Service → DateTime → Confirm. Now there's an extra Location step between Service and DateTime that needs an additional Continue click.

- [ ] **Step 1: Confirm the failing tests**

```bash
npm test --prefix frontend 2>&1 | grep -A2 "FAIL\|✗\|×" | head -30
```

Note which tests in `BookingFlow.test.tsx` are failing.

- [ ] **Step 2: Read the test file**

```bash
cat frontend/src/pages/BookingFlow.test.tsx
```

Look for sequences of `fireEvent.click(screen.getByText('Continue'));` calls. The pattern likely looks like:

```tsx
// Click barber, click Continue → Service step
fireEvent.click(screen.getByText('Continue'));
// Pick service, click Continue → DateTime step
fireEvent.click(screen.getByText('Continue'));
// Pick date+time, click Continue → Confirm step
fireEvent.click(screen.getByText('Continue'));
```

After the change, there's a Location step between Service and DateTime. Each test that walks past the Service step needs ONE additional Continue click immediately after the "service" Continue.

- [ ] **Step 3: Add a helper for clarity (optional refactor)**

If the tests have many duplicated advance sequences, consider extracting a helper near the top of the test file:

```tsx
async function advanceThroughLocation() {
  // After service is selected and Continue clicked, the Location step renders.
  // It auto-validates as soon as `shop` is loaded, so just click Continue once more.
  await waitFor(() => {
    expect(screen.getByText(/Where to/i)).toBeInTheDocument();
  });
  fireEvent.click(screen.getByText('Continue'));
}
```

Otherwise, just inline an extra `fireEvent.click(screen.getByText('Continue'));` after each "service Continue" click.

- [ ] **Step 4: Update the failing tests**

For each test that walked through the 4-step flow, find the spot where it advances past the Service step. Insert immediately AFTER that:

```tsx
// Wait for Location step to render, then advance past it
await waitFor(() => expect(screen.getByText(/Where to/i)).toBeInTheDocument());
fireEvent.click(screen.getByText('Continue'));
```

(If you used the helper from Step 3, call `await advanceThroughLocation();` instead.)

The exact tests to fix depend on the existing file. The test file has lines like 154 (`advances to service step after selecting a barber`) — this test does NOT need a fix because it stops at the Service step. Tests that advance past Service to DateTime or Confirm DO need the fix.

- [ ] **Step 5: Run tests, confirm green**

```bash
npx vitest run src/pages/BookingFlow.test.tsx --root frontend
```
Expected: all tests in this file pass.

- [ ] **Step 6: Run full frontend suite**

```bash
npm test --prefix frontend 2>&1 | tail -3
```
Expected: 38 passing (no new tests added yet — that's Task 5).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/BookingFlow.test.tsx
git commit -m "test(booking): update existing tests for 5-step flow

Adds an extra Continue click in tests that walk past the Service step
to handle the now-mandatory Location step.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 5: New tests for Location step content

**Files:**
- Modify: `frontend/src/pages/BookingFlow.test.tsx`

Add 3 tests that exercise the new Location confirmation card.

- [ ] **Step 1: Inspect the existing test harness**

Look at how the test file mocks `apiClient`. Specifically, find the mock for `apiClient.get('/public/shops/...')`. The new tests need that mock to also return `settings: { open_time, close_time }` and a shop with `phone` set so the new icons render.

```bash
grep -n "public/shops\|setShop\|mockResolvedValue" frontend/src/pages/BookingFlow.test.tsx | head -20
```

If the existing mock returns:
```ts
{ shop: { id: 1, name: 'Test Shop', address: '123 Main St' }, services: [...], barbers: [...] }
```

Then the new tests need a mock that includes `phone` and `settings`. You can either modify the global mock or override per test.

- [ ] **Step 2: Add the 3 new tests**

Inside the existing `describe('BookingFlow Component', ...)` block (or whatever the top-level describe is), append:

```tsx
  it('shows shop name and address on the Location step', async () => {
    // Set up mock to return a shop with full data
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url.startsWith('/public/shops/')) {
        return Promise.resolve({
          data: {
            shop: { id: 1, name: 'Loc Test Shop', address: '500 Maple Ave', phone: '+1-555-0150' },
            services: [{ id: 1, name: 'Cut', price: 25, duration_minutes: 30 }],
            barbers: [{ id: 1, name: 'Sam', fullname: 'Sam Q' }],
            settings: { open_time: '09:00', close_time: '19:00' },
          }
        });
      }
      return Promise.resolve({ data: [] });
    });

    render(
      <MemoryRouter initialEntries={['/book/1']}>
        <Routes>
          <Route path="/book/:shopId" element={<BookingFlow />} />
        </Routes>
      </MemoryRouter>
    );

    // Pick the barber
    await screen.findByText('Sam Q');
    fireEvent.click(screen.getByText('Sam Q'));
    fireEvent.click(screen.getByText('Continue'));

    // Pick the service
    await screen.findByText('Cut');
    fireEvent.click(screen.getByText('Cut'));
    fireEvent.click(screen.getByText('Continue'));

    // Now on Location step
    await screen.findByText(/Where to/i);
    expect(screen.getByText('Loc Test Shop')).toBeInTheDocument();
    expect(screen.getByText('500 Maple Ave')).toBeInTheDocument();
    expect(screen.getByText('+1-555-0150')).toBeInTheDocument();
    expect(screen.getByText(/09:00.*19:00/)).toBeInTheDocument();
  });

  it('renders a Get directions link with the shop address', async () => {
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url.startsWith('/public/shops/')) {
        return Promise.resolve({
          data: {
            shop: { id: 1, name: 'L Shop', address: '500 Maple Ave', phone: null },
            services: [{ id: 1, name: 'Cut', price: 25, duration_minutes: 30 }],
            barbers: [{ id: 1, name: 'Sam', fullname: 'Sam Q' }],
            settings: { open_time: null, close_time: null },
          }
        });
      }
      return Promise.resolve({ data: [] });
    });

    render(
      <MemoryRouter initialEntries={['/book/1']}>
        <Routes>
          <Route path="/book/:shopId" element={<BookingFlow />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByText('Sam Q');
    fireEvent.click(screen.getByText('Sam Q'));
    fireEvent.click(screen.getByText('Continue'));
    await screen.findByText('Cut');
    fireEvent.click(screen.getByText('Cut'));
    fireEvent.click(screen.getByText('Continue'));

    await screen.findByText(/Where to/i);
    const link = screen.getByText('Get directions').closest('a');
    expect(link).toHaveAttribute('href', expect.stringContaining('maps.google.com'));
    expect(link?.getAttribute('href')).toContain(encodeURIComponent('500 Maple Ave'));
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('hides hours row when both open_time and close_time are null', async () => {
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url.startsWith('/public/shops/')) {
        return Promise.resolve({
          data: {
            shop: { id: 1, name: 'L Shop', address: '500 Maple Ave', phone: null },
            services: [{ id: 1, name: 'Cut', price: 25, duration_minutes: 30 }],
            barbers: [{ id: 1, name: 'Sam', fullname: 'Sam Q' }],
            settings: { open_time: null, close_time: null },
          }
        });
      }
      return Promise.resolve({ data: [] });
    });

    render(
      <MemoryRouter initialEntries={['/book/1']}>
        <Routes>
          <Route path="/book/:shopId" element={<BookingFlow />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByText('Sam Q');
    fireEvent.click(screen.getByText('Sam Q'));
    fireEvent.click(screen.getByText('Continue'));
    await screen.findByText('Cut');
    fireEvent.click(screen.getByText('Cut'));
    fireEvent.click(screen.getByText('Continue'));

    await screen.findByText(/Where to/i);
    // Should NOT see a "—" hours separator since both fields are null
    expect(screen.queryByText(/—/)).not.toBeInTheDocument();
  });
```

(Imports: ensure `vi`, `waitFor`, `MemoryRouter`, `Routes`, `Route`, `apiClient` are imported at the top of the file. They likely are if other tests use them.)

- [ ] **Step 3: Run the new tests**

```bash
npx vitest run src/pages/BookingFlow.test.tsx --root frontend
```
Expected: existing tests + 3 new = all passing. If a selector mismatches because the mock i18n returns keys instead of fallback strings, adjust the regex (`/Where to/i` should match either the key `booking.where_to` or the fallback "Where to?").

- [ ] **Step 4: Run full frontend suite**

```bash
npm test --prefix frontend 2>&1 | tail -3
```
Expected: 38 + 3 = 41 passing.

- [ ] **Step 5: Verify build**

```bash
bash scripts/ai-verify.sh 2>&1 | grep -c "error TS"
```
Expected: 0.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/BookingFlow.test.tsx
git commit -m "test(booking): cover Location step content + Get directions link

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 6: Final verification

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
Expected: 284 backend + 41 frontend = 325 passing.

- [ ] **Step 3: Manual smoke test (optional but recommended)**

```bash
npm run dev
```
1. Log in as `admin` / `devpass`
2. Open `/discovery`, pick a shop
3. Walk through the booking flow: Barber → Service → **Location (NEW)** → Date/Time → Confirm
4. On the Location step, confirm: shop name as h3, address with map-pin icon, phone with phone icon (if shop has one), hours with clock icon (if shop has settings), Get directions button.
5. Click Get directions — confirm it opens `maps.google.com/?q=<address>` in a new tab.

- [ ] **Step 4: No additional commit** — every prior task already committed its changes.

---

## Self-Review

**Spec coverage:**
- ✅ Always show LOCATION as Step 2 — Task 3 Step 2
- ✅ Confirmation card with shop name h3 — Task 3 Step 6
- ✅ Address row with MapPin icon — Task 3 Step 6
- ✅ Phone row with Phone icon, tap-to-call link — Task 3 Step 6
- ✅ Hours row with Clock icon, hidden when both null — Task 3 Step 6 + Task 5 hides-row test
- ✅ Get directions button to maps.google.com — Task 3 Step 6 + Task 5 directions test
- ✅ Backend extension to return settings — Task 1
- ✅ i18n keys (en + es) — Task 2
- ✅ Update existing tests for 5-step flow — Task 4
- ✅ New tests for Location content — Task 5

**Placeholder scan:** No "TBD" / "TODO" / "fill in" / "similar to". Every step has concrete code or commands.

**Type consistency:**
- `settings: { open_time: string | null; close_time: string | null } | null` — used consistently across Tasks 1 (backend response), 3 (frontend state and rendering), and 5 (test mocks).
- `shop` always treated as optional/null until loaded; render guards check `shop &&`.
- STEP indices: BARBER=0, SERVICE=1, LOCATION=2, DATETIME=3, CONFIRM=4 — used consistently.

**One pre-existing risk noted in the spec:** the Task 4 step relies on inspecting the actual content of `BookingFlow.test.tsx` to find which tests need an extra Continue click. The plan calls this out and provides a generic fix pattern; the implementer iterates per failing test.
