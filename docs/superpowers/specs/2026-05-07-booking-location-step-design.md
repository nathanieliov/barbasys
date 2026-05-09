# Booking Flow — Location Step Polish — Design Spec

**Date:** 2026-05-07
**Scope:** Replace the dead/placeholder Location step in `BookingFlow.tsx` with a real shop-info confirmation card. Always show it as Step 2 of the 5-step flow.

---

## Problem

The booking flow currently treats the Location step as conditional dead code:

- `STEP.LOCATION = hasShopId ? -1 : 2` — when a shop is pre-selected (always, in current routing), LOCATION is set to -1 and the step body never renders.
- When the step *does* render (no shopId case), it shows a CSS-pattern "map placeholder" with no useful info, no map, and no actions.

Users coming from `/discovery` or a direct `/book/:shopId` link have no in-flow confirmation of *which physical shop they're booking at*, no address visible during the flow, and no easy "Get directions" button before the appointment.

## Goal

Always show Step 2 as a Location confirmation card with:
- Shop name (h2)
- Full address with map-pin icon
- Phone (when present), tap-to-call
- Open hours (when configured)
- "Get directions" button that opens the user's native maps app via `https://maps.google.com/?q={urlencoded address}`

The step is informational — there's no choice to make. The Continue button is enabled as soon as the shop is loaded.

## Non-Goals

- Embedded map (no API keys, no Nominatim/OpenStreetMap iframe)
- Actual lat/lng storage
- Multi-shop picker (deferred — covered by `/discovery`)
- Per-day hours (uses single open_time / close_time pair from shop_settings)
- Public-holidays banner

## Backend

### Extend `GET /api/public/shops/:id`

Currently returns:
```ts
{ shop, services, barbers }
```

Add a `settings` object with the two relevant fields:
```ts
{
  shop,
  services,
  barbers,
  settings: {
    open_time: string | null,   // e.g. "09:00"
    close_time: string | null,  // e.g. "19:00"
  }
}
```

Implementation: query `shop_settings` for `open_time` and `close_time` keys for that shop_id, fold into the response object. If neither row exists, return `{ open_time: null, close_time: null }`.

No DB migration — the table already exists.

## Frontend

### `BookingFlow.tsx`

**1. Always show Location step.** Change the `STEP` definition:

```ts
const STEP = {
  BARBER: 0,
  SERVICE: 1,
  LOCATION: 2,     // was: hasShopId ? -1 : 2
  DATETIME: 3,
  CONFIRM: 4,
};
```

And `STEP_LABELS` becomes the 5-element array unconditionally:
```ts
const STEP_LABELS = [
  t('nav.barbers', 'Barber'),
  t('nav.services', 'Service'),
  t('booking.location', 'Location'),
  t('booking.date_time', 'Date & Time'),
  t('booking.confirm', 'Confirm'),
];
```

The two-form `hasShopId ? ... : ...` ternary for `STEP_LABELS` and `STEP` is removed.

**2. Update step gating.** In `canAdvance()`, the existing check `if (STEP.LOCATION >= 0 && ...)` becomes `if (step === STEP.LOCATION) return !!shop;`.

**3. Update the Location step render.** Replace the existing OptionCard with a confirmation card:

```tsx
{step === STEP.LOCATION && shop && (
  <>
    <h2 className="section-title" style={{ fontSize: 28, margin: '0 0 6px' }}>
      {t('booking.where_to', 'Where to?')}
    </h2>
    <p className="muted" style={{ margin: '0 0 22px', fontSize: 15 }}>
      {t('booking.location_confirm_hint', "Here's where your appointment will be.")}
    </p>

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
          style={{ alignSelf: 'flex-start', marginTop: 4, textDecoration: 'none' }}
        >
          <Navigation size={14} /> {t('booking.get_directions', 'Get directions')}
        </a>
      )}
    </div>
  </>
)}
```

**4. Add settings state.** A new piece of component state:
```ts
const [settings, setSettings] = useState<{ open_time: string | null; close_time: string | null } | null>(null);
```

In the existing `useEffect` that loads shop info, also capture `res.data.settings`:
```ts
apiClient.get(`/public/shops/${shopId}`).then(res => {
  setShop(res.data.shop);
  setSettings(res.data.settings ?? null);
  // ...rest unchanged
});
```

**5. Imports.** Add `Phone, Clock, Navigation` to the existing `lucide-react` imports if not already present.

### i18n keys

Add under `booking` namespace in both `en-US.json` and `es-DO.json` (skip if any already exist):

| Key | en-US | es-DO |
|---|---|---|
| `booking.location_confirm_hint` | "Here's where your appointment will be." | "Aquí es donde será tu cita." |
| `booking.get_directions` | "Get directions" | "Cómo llegar" |

(`booking.location` and `booking.where_to` already exist.)

## Testing

### Backend

Add to `backend/src/index.test.ts` (or wherever public shop tests live; if no test file exists for this endpoint, create `backend/src/routes/public-shops.test.ts` using supertest).

Skipping a brand-new test file for v1 — the change is small and the use case (shop_settings query) is straightforward. Manual smoke after wiring is sufficient.

(If the engineer wants unit coverage anyway, write a test that creates a shop with two `shop_settings` rows and verifies `GET /api/public/shops/:id` returns both `open_time` and `close_time` in `settings`.)

### Frontend

**Heads-up for the implementer:** the existing `BookingFlow.test.tsx` tests likely walk a 4-step flow (Barber → Service → Datetime → Confirm). Adding Location as Step 2 inserts a step in the middle. Review each existing test that calls Continue/advances steps and add an extra advance for the Location step where needed. The Location step's Continue is enabled as soon as `shop` is loaded, so existing tests that wait for shop data will already have it ready.

Extend `frontend/src/pages/BookingFlow.test.tsx`. Add tests:

1. **Location step visible by default** — render the flow, advance past Barber + Service steps, confirm the Location heading is shown.
2. **Renders shop info** — confirm name, address, phone are visible.
3. **Get directions link** — confirm the `<a>` with `href` containing `maps.google.com/?q=` and the URL-encoded address.

## Verification

- `bash scripts/ai-verify.sh` clean
- Backend tests: 284 (no regression). +1 if optional public-shops test added.
- Frontend tests: 38 + 3 = 41
- Manual smoke: open `/discovery`, pick a shop, advance through Barber + Service to Step 2 — see the address and phone, click "Get directions", confirm new tab opens maps.google.com with the address pre-filled.

## Out of scope

- Embedded map preview
- Storing/displaying lat/lng
- Multi-day hours
- Per-shop chair count

## Open questions

None.
