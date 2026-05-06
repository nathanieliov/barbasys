# Phase F — Secondary Admin Pages Design System Sweep

**Date:** 2026-05-06  
**Scope:** 7 secondary admin pages  
**Fidelity:** A — class-name sweep only (no layout restructuring)

---

## Goal

Apply Barbasys design-system class names to the 7 secondary admin pages that were not covered by Phases A–E. No new CSS will be written. No layout or feature changes.

## Pages in Scope

1. `frontend/src/pages/Customers.tsx`
2. `frontend/src/pages/Settings.tsx`
3. `frontend/src/pages/SalesHistory.tsx`
4. `frontend/src/pages/Shifts.tsx`
5. `frontend/src/pages/Reports.tsx`
6. `frontend/src/pages/Users.tsx`
7. `frontend/src/pages/Analytics.tsx`

## Substitution Rules

| Old pattern | Replacement |
|---|---|
| `className="secondary"` on `<button>` | `className="btn btn-ghost"` |
| `className="primary"` on `<button>` | `className="btn btn-accent"` |
| `style={{ padding: '...', fontSize: '...' }}` on buttons | `className="btn btn-sm"` or `btn-lg` — drop inline style |
| Old container classes (`customers-container`, `my-schedule-container`, etc.) | Remove entirely (bare `<div>`) |
| `<table>` without `.tbl` | Add `className="tbl"` |
| Inline `color: var(--success)` / `var(--danger)` on buttons | Wrap with appropriate chip class or keep as token-based inline style |
| `className="modal-overlay"` / `modal-content` | Already design-system — leave as-is |

## Out of Scope

- Layout restructuring (no page-head, no card wrapping)
- New features or API changes
- Adding `.tbl` to elements that are not `<table>` (lists stay as lists)
- `index.css` changes

## Approach

Sequential page-by-page: read → edit → move to next. Single verification run (`bash scripts/ai-verify.sh`) at the end.

## Success Criteria

- `bash scripts/ai-verify.sh` passes with no type errors
- All 285 tests continue to pass
- No `button.secondary`, `button.primary`, or old container classes remain in the 7 files
