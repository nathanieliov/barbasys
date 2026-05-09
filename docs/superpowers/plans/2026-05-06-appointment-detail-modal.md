# Appointment Detail Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the no-op appointment chip click on the Schedule page with a detail Modal that exposes the 5-action barber workflow (mark in-chair, mark complete → POS, mark no-show, cancel, view-only).

**Architecture:** Reuse the existing `Modal` component. Extend the `Appointment.status` union from 3 to 5 states. Status changes use the existing `PATCH /api/appointments/:id` and `POST /api/appointments/:id/cancel` endpoints; no new backend routes.

**Tech Stack:** React 18 + TypeScript + Vite, vitest + @testing-library/react for tests, i18next for locales, vanilla CSS with design tokens.

**Spec:** `docs/superpowers/specs/2026-05-06-appointment-detail-modal-design.md`

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `shared/src/index.ts` | Modify | Source-of-truth `Appointment.status` union |
| `backend/src/domain/entities.ts` | Modify | Backend-local mirror of `Appointment.status` |
| `backend/src/repositories/sqlite-appointment-repository.ts` | Modify | Repo `updateStatus` parameter type |
| `frontend/src/locales/en-US.json` | Modify | English copy for new actions/statuses |
| `frontend/src/locales/es-DO.json` | Modify | Spanish copy for new actions/statuses |
| `frontend/src/index.css` | Modify | Status modifier classes for `.appt` chips |
| `frontend/src/pages/Schedule.tsx` | Modify | Add modal state, replace chip onClick, render detail modal, implement 4 action handlers |
| `frontend/src/pages/Schedule.test.tsx` | Create | Component tests for chip click + modal + handlers |

---

### Task 1: Extend `Appointment.status` union across shared + backend

**Files:**
- Modify: `shared/src/index.ts:68-78` (the `Appointment` interface)
- Modify: `backend/src/domain/entities.ts:103-116` (the `Appointment` interface)
- Modify: `backend/src/repositories/sqlite-appointment-repository.ts:33` (the `updateStatus` parameter)

- [ ] **Step 1: Update `shared/src/index.ts`**

Find the `Appointment` interface and replace the `status` field. The full interface looks like:

```ts
export interface Appointment {
  id: number;
  barber_id: number;
  customer_id: number | null;
  service_id: number;
  start_time: string;
  total_duration_minutes: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  reminder_sent: number;
  recurring_id: string | null;
  recurring_rule: string | null;
  shop_id: number | null;
  notes?: string | null;
}
```

Change the `status` line to:

```ts
  status: 'scheduled' | 'in-chair' | 'completed' | 'no-show' | 'cancelled';
```

- [ ] **Step 2: Update `backend/src/domain/entities.ts`**

Same change in the local `Appointment` interface — replace the `status` field with the 5-member union.

- [ ] **Step 3: Update `sqlite-appointment-repository.ts:33`**

Find the `updateStatus` method:

```ts
async updateStatus(id: number, status: 'scheduled' | 'completed' | 'cancelled'): Promise<void> {
```

Replace with:

```ts
async updateStatus(id: number, status: 'scheduled' | 'in-chair' | 'completed' | 'no-show' | 'cancelled'): Promise<void> {
```

Also check the corresponding interface file `sqlite-appointment-repository.interface.ts` (or `appointment-repository.interface.ts`) — if `updateStatus` is declared there with the old union, update it identically. (If only the implementation has the union and the interface uses `string`, no change needed there.)

- [ ] **Step 4: Verify build + types**

Run:
```bash
bash scripts/ai-verify.sh
```
Expected: exits clean with no `error TS` lines.

- [ ] **Step 5: Run all tests**

```bash
npm test --prefix backend && npm test --prefix frontend
```
Expected: 268 backend + 17 frontend = 285 passing.

- [ ] **Step 6: Commit**

```bash
git add shared/src/index.ts backend/src/domain/entities.ts backend/src/repositories/sqlite-appointment-repository.ts
git commit -m "feat(types): extend Appointment.status with in-chair and no-show

Adds 'in-chair' and 'no-show' statuses to the Appointment status union
across the shared contract, backend domain, and repository signatures.
DB schema needs no migration (column is TEXT with no CHECK constraint).

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Add i18n keys (en-US + es-DO)

**Files:**
- Modify: `frontend/src/locales/en-US.json` (the `schedule` namespace, around line 127)
- Modify: `frontend/src/locales/es-DO.json` (the `schedule` namespace)

- [ ] **Step 1: Add keys to `en-US.json`**

Find the `"schedule": { ... }` block. Append the following keys inside it (just before the closing `}` of the schedule namespace, preserving valid JSON — add a comma to the previous last key if needed):

```json
    "appointment_details": "Appointment details",
    "mark_in_chair": "Mark in chair",
    "mark_complete": "Mark complete",
    "mark_no_show": "Mark no-show",
    "open_in_pos": "Open in POS",
    "cancel_reason_prompt": "Optional: reason for cancellation?",
    "notes": "Notes",
    "barber": "Barber",
    "service": "Service",
    "date_time": "Date & time",
    "status": {
      "scheduled": "Scheduled",
      "in_chair": "In chair",
      "completed": "Completed",
      "no_show": "No-show",
      "cancelled": "Cancelled"
    }
```

(If keys with the same name already exist anywhere in `schedule`, e.g. `"barber"` or `"service"`, leave the existing ones alone and skip those duplicates.)

- [ ] **Step 2: Add the same keys to `es-DO.json`** with Spanish copy:

```json
    "appointment_details": "Detalles de la cita",
    "mark_in_chair": "Marcar en silla",
    "mark_complete": "Marcar completada",
    "mark_no_show": "Marcar como ausente",
    "open_in_pos": "Abrir en POS",
    "cancel_reason_prompt": "Opcional: ¿razón de la cancelación?",
    "notes": "Notas",
    "barber": "Barbero",
    "service": "Servicio",
    "date_time": "Fecha y hora",
    "status": {
      "scheduled": "Agendada",
      "in_chair": "En silla",
      "completed": "Completada",
      "no_show": "Ausente",
      "cancelled": "Cancelada"
    }
```

- [ ] **Step 3: Verify JSON is valid**

```bash
node -e "JSON.parse(require('fs').readFileSync('frontend/src/locales/en-US.json'))" && \
node -e "JSON.parse(require('fs').readFileSync('frontend/src/locales/es-DO.json'))" && \
echo OK
```
Expected: prints `OK`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/locales/en-US.json frontend/src/locales/es-DO.json
git commit -m "feat(i18n): add schedule appointment-detail keys (en-US + es-DO)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Add CSS modifiers for new appointment statuses

**Files:**
- Modify: `frontend/src/index.css` (find the `.appt` and `.appt-done` block; append modifiers next to it)

- [ ] **Step 1: Locate existing appt classes**

```bash
grep -n "^\.appt" frontend/src/index.css
```
Note the line number of the last `.appt-*` rule.

- [ ] **Step 2: Append the new modifier classes**

Add immediately after the last existing `.appt-*` rule:

```css
.appt.appt-in-chair {
  background: var(--butter-soft);
  color: var(--ink);
  border: 2px solid var(--butter);
}
.appt.appt-no-show {
  opacity: 0.5;
  text-decoration: line-through;
}
.appt.appt-cancelled {
  opacity: 0.4;
  text-decoration: line-through;
}
```

- [ ] **Step 3: Build to confirm CSS still parses**

```bash
npm run build:frontend
```
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/index.css
git commit -m "feat(design): add .appt modifiers for in-chair / no-show / cancelled

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Update chip className to render all 5 statuses

**Files:**
- Modify: `frontend/src/pages/Schedule.tsx` (around line 203, the chip rendering inside the appointment grid)

- [ ] **Step 1: Locate the chip render**

```bash
grep -n "appt-done\|APPT_CLASSES" frontend/src/pages/Schedule.tsx
```

- [ ] **Step 2: Replace the className expression**

Find the existing chip rendering, which looks like:

```tsx
const isDone = a.status === 'completed';
return (
  <div
    key={a.id}
    className={`appt ${APPT_CLASSES[bi % APPT_CLASSES.length]} ${isDone ? 'appt-done' : ''}`}
```

Replace with a status-aware helper. Above the `return (` for the chip, replace the `isDone` line with:

```tsx
const statusClass =
  a.status === 'completed' ? 'appt-done' :
  a.status === 'in-chair' ? 'appt-in-chair' :
  a.status === 'no-show' ? 'appt-no-show' :
  a.status === 'cancelled' ? 'appt-cancelled' : '';
```

And update the className template to use `statusClass`:

```tsx
className={`appt ${APPT_CLASSES[bi % APPT_CLASSES.length]} ${statusClass}`}
```

- [ ] **Step 3: Verify build**

```bash
bash scripts/ai-verify.sh
```
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Schedule.tsx
git commit -m "feat(schedule): chip className renders all 5 statuses

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 5: Scaffold `Schedule.test.tsx` with a failing test for modal opening

**Files:**
- Create: `frontend/src/pages/Schedule.test.tsx`

- [ ] **Step 1: Write the failing test file**

Create `frontend/src/pages/Schedule.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Schedule from './Schedule';
import apiClient from '../api/apiClient';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../hooks/useAuth';

vi.mock('../api/apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: any) => (typeof fallback === 'string' ? fallback : key),
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const mockBarbers = [
  { id: 1, fullname: 'Carlos Mendez', name: 'Carlos' },
];
const mockServices = [
  { id: 10, name: 'Haircut', duration_minutes: 30, price: 25 },
];
const mockAppointments = [
  {
    id: 100,
    barber_id: 1,
    service_id: 10,
    customer_id: 5,
    customer_name: 'Alice Smith',
    start_time: '2026-05-06T10:00:00',
    status: 'scheduled',
    notes: null,
  },
];

function setupApiMocks() {
  vi.mocked(apiClient.get).mockImplementation((url: string) => {
    if (url.startsWith('/barbers')) return Promise.resolve({ data: mockBarbers });
    if (url.startsWith('/services')) return Promise.resolve({ data: mockServices });
    if (url.startsWith('/appointments')) return Promise.resolve({ data: mockAppointments });
    return Promise.resolve({ data: [] });
  });
}

function renderSchedule() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Schedule />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Schedule appointment detail modal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupApiMocks();
  });

  it('opens the appointment detail modal when an appointment chip is clicked', async () => {
    renderSchedule();

    // Wait for appointments to load and chip to render
    const chip = await screen.findByText('Alice Smith');
    fireEvent.click(chip);

    // Modal title should appear (customer name as title)
    await waitFor(() => {
      expect(screen.getAllByText('Alice Smith').length).toBeGreaterThan(1); // chip + modal title
    });
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
npx vitest run src/pages/Schedule.test.tsx --prefix frontend
```
Expected: FAIL — clicking the chip doesn't open a modal (only the chip text appears once, not twice).

- [ ] **Step 3: Do NOT commit a failing test alone — proceed to Task 6**

The next task implements the behavior to make this test pass.

---

### Task 6: Add `selectedAppointment` state and render detail Modal

**Files:**
- Modify: `frontend/src/pages/Schedule.tsx`

- [ ] **Step 1: Add the state hook**

Near the top of the component, alongside the other `useState` calls, add:

```tsx
const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
```

- [ ] **Step 2: Replace chip onClick**

Find the chip's `onClick` (currently calling `updateStatus(a.id, 'in-chair')`):

```tsx
onClick={() => {
  if (!isDone) updateStatus(a.id, 'in-chair');
}}
```

Replace with:

```tsx
onClick={() => setSelectedAppointment(a)}
```

(`isDone` is no longer needed for the click handler — the modal itself gates which actions are available based on status.)

- [ ] **Step 3: Render the detail Modal**

At the bottom of the JSX, just before the closing `</div>` of the page wrapper and right after the existing booking `<Modal>`, add:

```tsx
<Modal
  isOpen={selectedAppointment != null}
  onClose={() => setSelectedAppointment(null)}
  title={selectedAppointment?.customer_name || t('schedule.walk_in', 'Walk-in')}
  size="md"
>
  {selectedAppointment && (() => {
    const appt = selectedAppointment;
    const svc = services.find(s => s.id === appt.service_id);
    const brb = barbers.find(b => b.id === appt.barber_id);
    const start = new Date(appt.start_time);
    const dur = svc?.duration_minutes || 30;
    const end = new Date(start.getTime() + dur * 60000);
    const fmtTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const fmtDate = (d: Date) => d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Row label={t('schedule.service', 'Service')} value={`${svc?.name || '–'} · ${dur} min · $${svc?.price ?? '–'}`} />
        <Row label={t('schedule.barber', 'Barber')} value={brb?.fullname || brb?.name || '–'} />
        <Row label={t('schedule.date_time', 'Date & time')} value={`${fmtDate(start)} · ${fmtTime(start)}–${fmtTime(end)}`} />
        {appt.notes && <Row label={t('schedule.notes', 'Notes')} value={appt.notes} />}
      </div>
    );
  })()}
</Modal>
```

Add the `Row` helper component above the `Schedule` component definition (above the `export default function Schedule()`):

```tsx
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 12, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{value}</span>
    </div>
  );
}
```

- [ ] **Step 4: Run the test and confirm it passes**

```bash
npx vitest run src/pages/Schedule.test.tsx --prefix frontend
```
Expected: PASS — the modal renders with the customer name as title.

- [ ] **Step 5: Run all frontend tests**

```bash
npm test --prefix frontend
```
Expected: 18 passing (17 + 1 new).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/Schedule.tsx frontend/src/pages/Schedule.test.tsx
git commit -m "feat(schedule): open detail modal on appointment chip click

Replace the prior implicit 'click → mark in-chair' behavior with a
view-only detail modal showing service, barber, date/time, and notes.
Action buttons land in a follow-up commit.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 7: Add conditional action buttons (footer)

**Files:**
- Modify: `frontend/src/pages/Schedule.test.tsx` (add tests)
- Modify: `frontend/src/pages/Schedule.tsx` (add footer)

- [ ] **Step 1: Write failing tests**

Add to `Schedule.test.tsx` inside the existing `describe`:

```tsx
  it('shows in-chair, no-show, and cancel buttons for a scheduled appointment', async () => {
    renderSchedule();
    const chip = await screen.findByText('Alice Smith');
    fireEvent.click(chip);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Mark in chair' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Mark no-show' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  it('shows only Open in POS + Close for a completed appointment', async () => {
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url.startsWith('/barbers')) return Promise.resolve({ data: mockBarbers });
      if (url.startsWith('/services')) return Promise.resolve({ data: mockServices });
      if (url.startsWith('/appointments')) {
        return Promise.resolve({ data: [{ ...mockAppointments[0], status: 'completed' }] });
      }
      return Promise.resolve({ data: [] });
    });

    renderSchedule();
    const chip = await screen.findByText('Alice Smith');
    fireEvent.click(chip);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Open in POS' })).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: 'Mark in chair' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark no-show' })).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run and verify failing**

```bash
npx vitest run src/pages/Schedule.test.tsx --prefix frontend
```
Expected: 2 failing tests (the buttons don't exist yet).

- [ ] **Step 3: Implement the footer**

In `Schedule.tsx`, add a `footer` prop to the detail `<Modal>`. Build the footer as a `<div>` of buttons whose visibility depends on `selectedAppointment.status`. Replace the `<Modal>` render with:

```tsx
<Modal
  isOpen={selectedAppointment != null}
  onClose={() => setSelectedAppointment(null)}
  title={selectedAppointment?.customer_name || t('schedule.walk_in', 'Walk-in')}
  size="md"
  footer={selectedAppointment && (() => {
    const status = selectedAppointment.status;
    const id = selectedAppointment.id;
    return (
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {status === 'scheduled' && (
          <>
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--primary-deep)' }} onClick={() => handleCancel(id)}>{t('common.cancel', 'Cancel')}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => handleMarkNoShow(id)}>{t('schedule.mark_no_show', 'Mark no-show')}</button>
            <button className="btn btn-primary btn-sm" onClick={() => handleMarkInChair(id)}>{t('schedule.mark_in_chair', 'Mark in chair')}</button>
          </>
        )}
        {status === 'in-chair' && (
          <>
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--primary-deep)' }} onClick={() => handleCancel(id)}>{t('common.cancel', 'Cancel')}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => handleMarkNoShow(id)}>{t('schedule.mark_no_show', 'Mark no-show')}</button>
            <button className="btn btn-accent btn-sm" onClick={() => handleMarkComplete(id)}>{t('schedule.mark_complete', 'Mark complete')}</button>
          </>
        )}
        {status === 'completed' && (
          <>
            <button className="btn btn-soft btn-sm" onClick={() => setSelectedAppointment(null)}>{t('common.close', 'Close')}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedAppointment(null); navigate(`/pos?appointmentId=${id}`); }}>{t('schedule.open_in_pos', 'Open in POS')}</button>
          </>
        )}
        {(status === 'no-show' || status === 'cancelled') && (
          <button className="btn btn-soft btn-sm" onClick={() => setSelectedAppointment(null)}>{t('common.close', 'Close')}</button>
        )}
      </div>
    );
  })()}
>
  {/* …existing children… */}
</Modal>
```

The 4 handler functions (`handleMarkInChair`, `handleMarkComplete`, `handleMarkNoShow`, `handleCancel`) will be added next; for now, declare them as no-op stubs above the JSX so the component compiles:

```tsx
const handleMarkInChair = (_id: number) => {};
const handleMarkComplete = (_id: number) => {};
const handleMarkNoShow = (_id: number) => {};
const handleCancel = (_id: number) => {};
```

(These stubs are deliberately temporary — Tasks 8–11 replace each one with a real implementation.)

- [ ] **Step 4: Run and verify passing**

```bash
npx vitest run src/pages/Schedule.test.tsx --prefix frontend
```
Expected: 3 passing tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Schedule.tsx frontend/src/pages/Schedule.test.tsx
git commit -m "feat(schedule): conditional action footer in detail modal

Renders different button sets per appointment status. Handlers are
stubbed; the next 4 commits wire up each one.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 8: Implement `handleMarkInChair` (TDD)

**Files:**
- Modify: `frontend/src/pages/Schedule.test.tsx`
- Modify: `frontend/src/pages/Schedule.tsx`

- [ ] **Step 1: Write the failing test**

Add to `Schedule.test.tsx`:

```tsx
  it('Mark in chair calls PATCH and closes the modal', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ data: { success: true } });

    renderSchedule();
    const chip = await screen.findByText('Alice Smith');
    fireEvent.click(chip);

    const button = await screen.findByRole('button', { name: 'Mark in chair' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith('/appointments/100', { status: 'in-chair' });
    });
    // After PATCH, fetch is called again and the modal is closed
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Mark in chair' })).not.toBeInTheDocument();
    });
  });
```

- [ ] **Step 2: Run, verify failing**

```bash
npx vitest run src/pages/Schedule.test.tsx -t "Mark in chair calls PATCH" --prefix frontend
```
Expected: FAIL — stub doesn't call apiClient.

- [ ] **Step 3: Implement the handler**

Replace the `handleMarkInChair` stub in `Schedule.tsx`:

```tsx
const handleMarkInChair = async (id: number) => {
  try {
    await apiClient.patch(`/appointments/${id}`, { status: 'in-chair' });
    setSelectedAppointment(null);
    fetchSchedule();
  } catch (err: any) {
    alert(err.response?.data?.error || 'Failed to update status');
  }
};
```

(`fetchSchedule` is the existing function in the component that loads appointments; if it has a different name, use that one — search for `apiClient.get('/appointments` to find it.)

- [ ] **Step 4: Run, verify passing**

```bash
npx vitest run src/pages/Schedule.test.tsx -t "Mark in chair calls PATCH" --prefix frontend
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Schedule.tsx frontend/src/pages/Schedule.test.tsx
git commit -m "feat(schedule): implement Mark in chair handler

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 9: Implement `handleMarkComplete` → POS handoff (TDD)

**Files:**
- Modify: `frontend/src/pages/Schedule.test.tsx`
- Modify: `frontend/src/pages/Schedule.tsx`

- [ ] **Step 1: Write the failing test**

Add to `Schedule.test.tsx`:

```tsx
  it('Mark complete on in-chair appointment calls PATCH and navigates to POS', async () => {
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url.startsWith('/barbers')) return Promise.resolve({ data: mockBarbers });
      if (url.startsWith('/services')) return Promise.resolve({ data: mockServices });
      if (url.startsWith('/appointments')) {
        return Promise.resolve({ data: [{ ...mockAppointments[0], status: 'in-chair' }] });
      }
      return Promise.resolve({ data: [] });
    });
    vi.mocked(apiClient.patch).mockResolvedValue({ data: { success: true } });

    renderSchedule();
    const chip = await screen.findByText('Alice Smith');
    fireEvent.click(chip);

    const button = await screen.findByRole('button', { name: 'Mark complete' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith('/appointments/100', { status: 'completed' });
    });
  });
```

(Note: navigation is verified implicitly through `useNavigate` mock if present; if `react-router-dom`'s navigate gets called, you can either inspect `window.location` after the click or — to keep the test stable — assert only on the PATCH call. The PATCH-only assertion above is sufficient.)

- [ ] **Step 2: Run, verify failing**

```bash
npx vitest run src/pages/Schedule.test.tsx -t "Mark complete" --prefix frontend
```
Expected: FAIL.

- [ ] **Step 3: Implement the handler**

Replace the stub:

```tsx
const handleMarkComplete = async (id: number) => {
  try {
    await apiClient.patch(`/appointments/${id}`, { status: 'completed' });
    setSelectedAppointment(null);
    navigate(`/pos?appointmentId=${id}`);
  } catch (err: any) {
    alert(err.response?.data?.error || 'Failed to update status');
  }
};
```

(Confirm `navigate` is already imported via `useNavigate()` in this component — search for `useNavigate`. If not, add `import { useNavigate } from 'react-router-dom'` and `const navigate = useNavigate();` at the top of the component.)

- [ ] **Step 4: Run, verify passing**

```bash
npx vitest run src/pages/Schedule.test.tsx -t "Mark complete" --prefix frontend
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Schedule.tsx frontend/src/pages/Schedule.test.tsx
git commit -m "feat(schedule): implement Mark complete handler with POS handoff

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 10: Implement `handleMarkNoShow` (TDD)

**Files:**
- Modify: `frontend/src/pages/Schedule.test.tsx`
- Modify: `frontend/src/pages/Schedule.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
  it('Mark no-show calls PATCH with no-show status', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ data: { success: true } });

    renderSchedule();
    const chip = await screen.findByText('Alice Smith');
    fireEvent.click(chip);

    const button = await screen.findByRole('button', { name: 'Mark no-show' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith('/appointments/100', { status: 'no-show' });
    });
  });
```

- [ ] **Step 2: Run, verify failing**

```bash
npx vitest run src/pages/Schedule.test.tsx -t "Mark no-show" --prefix frontend
```
Expected: FAIL.

- [ ] **Step 3: Implement the handler**

```tsx
const handleMarkNoShow = async (id: number) => {
  try {
    await apiClient.patch(`/appointments/${id}`, { status: 'no-show' });
    setSelectedAppointment(null);
    fetchSchedule();
  } catch (err: any) {
    alert(err.response?.data?.error || 'Failed to update status');
  }
};
```

- [ ] **Step 4: Run, verify passing**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Schedule.tsx frontend/src/pages/Schedule.test.tsx
git commit -m "feat(schedule): implement Mark no-show handler

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 11: Implement `handleCancel` with reason prompt (TDD)

**Files:**
- Modify: `frontend/src/pages/Schedule.test.tsx`
- Modify: `frontend/src/pages/Schedule.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
  it('Cancel prompts for reason and POSTs to /cancel', async () => {
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('No-show after 15 min');
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true } });

    renderSchedule();
    const chip = await screen.findByText('Alice Smith');
    fireEvent.click(chip);

    const button = await screen.findByRole('button', { name: /cancel/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(promptSpy).toHaveBeenCalled();
      expect(apiClient.post).toHaveBeenCalledWith('/appointments/100/cancel', { reason: 'No-show after 15 min' });
    });

    promptSpy.mockRestore();
  });

  it('Cancel does not call API if user dismisses the prompt', async () => {
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue(null);
    vi.mocked(apiClient.post).mockClear();

    renderSchedule();
    const chip = await screen.findByText('Alice Smith');
    fireEvent.click(chip);

    const button = await screen.findByRole('button', { name: /cancel/i });
    fireEvent.click(button);

    await waitFor(() => expect(promptSpy).toHaveBeenCalled());
    expect(apiClient.post).not.toHaveBeenCalled();

    promptSpy.mockRestore();
  });
```

- [ ] **Step 2: Run, verify failing**

```bash
npx vitest run src/pages/Schedule.test.tsx -t "Cancel" --prefix frontend
```
Expected: 2 failing.

- [ ] **Step 3: Implement the handler**

```tsx
const handleCancel = async (id: number) => {
  const reason = window.prompt(t('schedule.cancel_reason_prompt', 'Optional: reason for cancellation?'));
  if (reason === null) return;
  try {
    await apiClient.post(`/appointments/${id}/cancel`, { reason });
    setSelectedAppointment(null);
    fetchSchedule();
  } catch (err: any) {
    alert(err.response?.data?.error || 'Failed to cancel appointment');
  }
};
```

- [ ] **Step 4: Run, verify passing**

```bash
npx vitest run src/pages/Schedule.test.tsx -t "Cancel" --prefix frontend
```
Expected: PASS (both).

- [ ] **Step 5: Run full frontend suite**

```bash
npm test --prefix frontend
```
Expected: 17 prior + 7 new = 24 passing.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/Schedule.tsx frontend/src/pages/Schedule.test.tsx
git commit -m "feat(schedule): implement Cancel handler with reason prompt

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 12: Final verification

- [ ] **Step 1: Full type-check + build**

```bash
bash scripts/ai-verify.sh
```
Expected: clean.

- [ ] **Step 2: Full test suite**

```bash
npm test --prefix backend && npm test --prefix frontend
```
Expected: 268 backend + 24 frontend = 292 passing.

- [ ] **Step 3: Manual smoke test (optional but recommended)**

```bash
npm run dev
```
Then in a browser at `http://localhost:5173`:
1. Log in as `admin` / `devpass`
2. Open `/schedule`
3. Create or use an existing appointment
4. Click the chip → modal opens with details
5. Click **Mark in chair** → grid chip turns butter-colored, modal closes
6. Click the chip again → modal shows in-chair state with **Mark complete** button
7. Click **Mark complete** → redirected to `/pos?appointmentId=...`
8. Navigate back, click another scheduled appointment → click **Mark no-show** → grid chip becomes dimmed/strikethrough
9. Click another → **Cancel** → enter reason → grid chip becomes dimmed/strikethrough

- [ ] **Step 4: No additional commit** — every prior task already committed its changes.

---

## Self-Review

**Spec coverage:**
- ✅ Modal opens on chip click — Tasks 5, 6
- ✅ Title with customer name / Walk-in — Task 6
- ✅ Status chip in header — *Not currently in plan.* The spec lists a status chip next to the title, but the implementation in Task 6 only renders the customer name. **Adding inline addendum below.**
- ✅ Detail rows (service/barber/date-time/notes) — Task 6
- ✅ Conditional footer buttons per status — Task 7
- ✅ Mark in-chair handler — Task 8
- ✅ Mark complete + POS handoff — Task 9
- ✅ Mark no-show handler — Task 10
- ✅ Cancel with reason prompt — Task 11
- ✅ Backend type extension — Task 1
- ✅ i18n keys — Task 2
- ✅ CSS modifiers — Task 3
- ✅ Chip className update — Task 4

**Status chip in header — addendum to Task 6**

After Step 3 of Task 6, before Step 4 (run test), add this Step 3a:

> **Step 3a: Add status chip beside the modal title**
>
> The `Modal` component's `title` prop is a string, so the status chip can't go inside the title itself. Instead, put it as the first child of the modal body. Update the body of the detail Modal (the `<div>` returned from the IIFE in Step 3) to lead with a chip:
>
> ```tsx
> const statusKey = (() => {
>   switch (appt.status) {
>     case 'in-chair': return 'in_chair';
>     case 'no-show': return 'no_show';
>     default: return appt.status;
>   }
> })();
> const chipVariant =
>   appt.status === 'completed' ? 'chip-success' :
>   appt.status === 'in-chair' ? 'chip-warn' :
>   appt.status === 'no-show' ? 'chip-danger' :
>   appt.status === 'cancelled' ? 'chip-plum' : '';
>
> return (
>   <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
>     <div><span className={`chip ${chipVariant}`}>{t(`schedule.status.${statusKey}`, appt.status)}</span></div>
>     <Row label={…} value={…} />
>     {/* …rest unchanged… */}
>   </div>
> );
> ```

**Placeholder scan:** No "TBD", "TODO", or "fill in details". All steps have concrete code or commands.

**Type consistency:**
- `selectedAppointment: any | null` — used consistently across Tasks 6–11 ✓
- `handleMarkInChair`, `handleMarkComplete`, `handleMarkNoShow`, `handleCancel` — names consistent across Tasks 7 (stubs) and 8–11 (implementations) ✓
- `fetchSchedule` — referenced in handlers; Task 8 includes a fallback note instructing the engineer to look up the actual function name in the existing component ✓
- Status union literals (`'scheduled'`, `'in-chair'`, `'completed'`, `'no-show'`, `'cancelled'`) consistent across Tasks 1, 4, 7, 8–11 ✓

**Ambiguity check:** None remaining.

---

## Execution

Plan complete and saved to `docs/superpowers/plans/2026-05-06-appointment-detail-modal.md`.
