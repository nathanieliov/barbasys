# Appointment Detail Modal — Design Spec

**Date:** 2026-05-06
**Scope:** Schedule page — replace no-op appointment click with a detail modal that supports the full barber workflow.

---

## Problem

On `frontend/src/pages/Schedule.tsx`, clicking an appointment chip currently calls `updateStatus(a.id, 'in-chair')` immediately, with no confirmation. This is unintentional UX (it was a placeholder) and the design handoff explicitly says "appointments are clickable, should open detail drawer."

There is no path from the schedule grid to view appointment details, mark a no-show, or cancel without leaving the page.

## Goal

Clicking an appointment chip opens a modal showing details and exposing the 5 actions a barber needs during a service: mark in-chair, mark complete (with POS handoff), mark no-show, cancel, and view-only.

## Non-Goals

- Editing appointment time, barber, or service (deferred to a future Reschedule feature).
- Editing customer info from this modal.
- Tipping/prepayment from the modal.
- Walk-in / empty-slot creation flow (clicks on empty grid cells are out of scope).

## UX

### Trigger
Click an appointment chip → open `Modal` (the existing component). Replaces the current implicit `onClick={() => updateStatus(a.id, 'in-chair')}` behavior.

### Modal content

**Header**
- Title: customer name (or `t('schedule.walk_in')`)
- Status chip next to title:
  - `scheduled` → plain `.chip` (no variant)
  - `in-chair` → `.chip-warn`
  - `completed` → `.chip-success`
  - `no-show` → `.chip-danger`
  - `cancelled` → `.chip-plum`

**Body — label/value rows**
- Service: `{name} · {duration} min · {price formatted}`
- Barber: `{fullname}`
- Date & time: `{weekday} {date} · {start}–{end}` (24h format, locale-aware)
- Notes: shown only if `a.notes` is non-empty

**Footer — actions** (conditional on `a.status`)

| Current status | Buttons (left → right) |
|---|---|
| `scheduled` | Mark in-chair (`btn-primary`) · Mark no-show (`btn-ghost`) · Cancel (`btn-ghost` w/ `--primary-deep` color) |
| `in-chair` | Mark complete → POS (`btn-accent`) · Mark no-show (`btn-ghost`) · Cancel (`btn-ghost` w/ `--primary-deep` color) |
| `completed` | Open in POS (`btn-ghost`) · Close (`btn-soft`) |
| `cancelled` or `no-show` | Close only (`btn-soft`) |

### Confirmation prompts
- **Cancel**: `window.prompt(t('schedule.cancel_reason_prompt'))` — same pattern as `MySchedule.tsx`. Empty string is allowed; `null` (user dismissed) aborts.
- **Mark complete → POS**: no confirm; calls PATCH then `navigate('/pos?appointmentId=' + id)`.
- **Mark no-show / in-chair**: no confirm.

### Post-action behavior
After every successful PATCH or POST, refetch appointments for the current date and close the modal. POS handoff closes the modal but does not refetch (navigation will unmount).

## Backend changes

### `shared/src/index.ts`
Extend the `Appointment.status` union from
```ts
status: 'scheduled' | 'completed' | 'cancelled';
```
to
```ts
status: 'scheduled' | 'in-chair' | 'completed' | 'no-show' | 'cancelled';
```

### `backend/src/domain/entities.ts`
Same extension on the local `Appointment` interface.

### `backend/src/repositories/sqlite-appointment-repository.ts`
Update `updateStatus` parameter type to the expanded union.

### Schema
No migration. The `status` column is `TEXT DEFAULT 'scheduled'` with no CHECK constraint, so existing rows and writes continue to work.

### Routes
No new routes. The existing endpoints already cover everything needed:
- `PATCH /api/appointments/:id` — used for in-chair, complete, no-show
- `POST /api/appointments/:id/cancel` — used for cancel (already enforces the `/cancel` path for cancellations)
- `GET /api/appointments?date=...` — used for refetch

## Frontend changes

### `frontend/src/pages/Schedule.tsx`
- New state: `const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);`
- Chip `onClick` becomes `setSelectedAppointment(a)`. Remove the auto-status assignment.
- Render a second `<Modal>` below the existing booking modal:
  - `isOpen={selectedAppointment != null}`
  - `onClose={() => setSelectedAppointment(null)}`
  - `title={selectedAppointment?.customer_name || t('schedule.walk_in')}`
  - Body and footer follow the structure above.
- New helper functions inside the component:
  - `handleMarkInChair(id)` → `apiClient.patch('/appointments/' + id, { status: 'in-chair' })` → refetch + close
  - `handleMarkComplete(id)` → `apiClient.patch(...)` then `navigate('/pos?appointmentId=' + id)`
  - `handleMarkNoShow(id)` → `apiClient.patch(...)` → refetch + close
  - `handleCancel(id)` → prompt + `apiClient.post('/appointments/' + id + '/cancel', { reason })` → refetch + close
- Reuse the existing `barbers` and `services` arrays already in scope to look up names from `selectedAppointment.barber_id` / `service_id`.

### `frontend/src/index.css`
Add status-based modifier classes for the appointment chips on the grid:
```css
.appt.appt-in-chair { background: var(--butter-soft); color: var(--ink); border: 2px solid var(--butter); }
.appt.appt-no-show { opacity: 0.5; text-decoration: line-through; }
.appt.appt-cancelled { opacity: 0.4; text-decoration: line-through; }
```
The existing `.appt-done` (used for `completed`) stays.

### `frontend/src/pages/Schedule.tsx` chip className
Update the className expression so chips render the new statuses:
```tsx
const statusClass =
  a.status === 'completed' ? 'appt-done' :
  a.status === 'in-chair' ? 'appt-in-chair' :
  a.status === 'no-show' ? 'appt-no-show' :
  a.status === 'cancelled' ? 'appt-cancelled' : '';
```
All statuses (including `cancelled`) render on the grid so barbers can see the full picture for the day. Cancelled and no-show chips remain clickable to open a view-only modal.

### i18n keys
Add to both `frontend/src/locales/en-US.json` and `es-DO.json` under the `schedule` namespace:

| Key | en-US | es-DO |
|---|---|---|
| `schedule.appointment_details` | "Appointment details" | "Detalles de la cita" |
| `schedule.mark_in_chair` | "Mark in chair" | "Marcar en silla" |
| `schedule.mark_complete` | "Mark complete" | "Marcar completada" |
| `schedule.mark_no_show` | "Mark no-show" | "Marcar como ausente" |
| `schedule.open_in_pos` | "Open in POS" | "Abrir en POS" |
| `schedule.status.scheduled` | "Scheduled" | "Agendada" |
| `schedule.status.in_chair` | "In chair" | "En silla" |
| `schedule.status.completed` | "Completed" | "Completada" |
| `schedule.status.no_show` | "No-show" | "Ausente" |
| `schedule.status.cancelled` | "Cancelled" | "Cancelada" |
| `schedule.cancel_reason_prompt` | "Optional: reason for cancellation?" | "Opcional: ¿razón de la cancelación?" |
| `schedule.notes` | "Notes" | "Notas" |
| `schedule.barber` | "Barber" | "Barbero" |
| `schedule.service` | "Service" | "Servicio" |
| `schedule.date_time` | "Date & time" | "Fecha y hora" |

## Testing

### `frontend/src/pages/Schedule.test.tsx`
Either extend the existing test file or create one. Use `vitest` + `@testing-library/react` with `apiClient` mocked.

Tests:
1. Renders schedule with one mock appointment; clicking the chip opens the modal with the customer name in the title.
2. With `status: 'scheduled'`, the modal shows Mark in-chair / Mark no-show / Cancel buttons.
3. Clicking Mark in-chair calls `apiClient.patch` with `{ status: 'in-chair' }` and closes the modal.
4. Clicking Cancel triggers `window.prompt` and calls `apiClient.post` to the cancel endpoint with the reason.
5. With `status: 'completed'`, only Open in POS and Close are shown.
6. Modal closes when the close button is clicked without making any API calls.

### Backend
No new backend tests required (no new endpoints or repository methods). Existing tests for PATCH and POST /cancel still cover the wire.

## Verification
- `bash scripts/ai-verify.sh` exits clean (build + type-check)
- `npm test --prefix backend` — all 268 tests pass (no behavior change)
- `npm test --prefix frontend` — at least 17 + 6 new = 23 passing
- Manual smoke: open `/schedule`, click a scheduled appointment, walk through each action and confirm grid refreshes correctly

## Open questions
None.
