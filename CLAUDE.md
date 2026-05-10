# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
npm run dev                    # Start backend (port 3000) + frontend (Vite) concurrently
npm run dev --prefix backend   # Backend only (nodemon + tsx, hot-reload)
npm run dev --prefix frontend  # Frontend only (Vite)
```

### Build
```bash
npm run build:shared           # Must run first — builds shared contracts
npm run build:backend          # TypeScript compile backend
npm run build:frontend         # tsc + vite build
npm run build                  # All three in sequence
```

### Testing
```bash
npm test --prefix backend      # Run all backend tests (vitest)
npm test --prefix frontend     # Run all frontend tests (vitest)
npx vitest run src/appointments.test.ts --prefix backend  # Single test file
```

### Verification (run before finalizing any change)
```bash
bash scripts/ai-verify.sh      # Cleans dist/, rebuilds shared+backend+frontend, type-checks all
```

### Docker (two environments, same host)
```bash
make prod-up          # Build + start production  (port 3000, ngrok :4040)
make stage-up         # Build + start stage       (port 3001, ngrok :4041)
make prod-down        # Stop production
make stage-down       # Stop stage
make prod-logs        # Tail production logs
make stage-logs       # Tail stage logs
make prod-restart     # Restart prod app (no rebuild)
make stage-restart    # Restart stage app (no rebuild)
make stage-refresh-db # Copy prod DB snapshot → stage
make up               # Start both environments
make down             # Stop both environments
make ps               # Show container status for both
```

### Utilities
```bash
npm run doctor                 # Environment health check
npm run demo:setup --prefix backend  # Seed demo data (tsx src/scripts/seed-demo.ts)
bash scripts/new-adr.sh "Title"      # Scaffold a new ADR in docs/adr/
```

## Architecture

### Monorepo Layout
- **`shared/`** — Single source of truth for TypeScript interfaces (`Barber`, `Customer`, `Sale`, `Appointment`, `User`, etc.) consumed by both backend and frontend via the `@barbasys/shared` workspace alias. **Always update shared contracts before touching backend or frontend.**
- **`backend/`** — Node.js/Express + SQLite, uses `better-sqlite3` (synchronous driver).
- **`frontend/`** — React 18 + Vite, vanilla CSS, `react-router-dom` v6, `lucide-react` icons.

### Backend Clean Architecture Layers
```
src/domain/entities.ts          ← Core types (backend-only, richer than shared — includes password_hash, OTP fields)
src/use-cases/                  ← Business logic; each file/class gets one repository injected, no Express types here
src/repositories/               ← Interface + SQLite implementation pairs (e.g., IBarberRepository + SQLiteBarberRepository)
src/adapters/                   ← External integrations (whatsapp/, llm/, google-calendar/, rate-limiter/)
src/routes/                     ← Thin Express routers; only parse request, call use-cases, return response
src/middleware/auth-middleware.ts ← JWT verify + RBAC; re-fetches user from DB on every request to avoid stale tokens
src/db.ts                       ← Schema definition and DB initialization; test env uses `:memory:`, prod uses data/barbasys.db
src/index.ts                    ← App entry point; instantiates all repositories and use-cases, mounts routers
```

### RBAC Roles
`OWNER` > `MANAGER` > `BARBER` > `CUSTOMER`. Use `protect` + `authorize(...roles)` middleware from `src/middleware/auth-middleware.ts`. The JWT payload carries `shop_id`; multi-shop isolation is enforced at the use-case and query level.

### WhatsApp Chatbot Flow
`POST /api/chatbot/webhooks/whatsapp` (Twilio webhook) → `handle-inbound-message.ts` (orchestrator) → `resolve-customer.ts` (upsert customer by phone) → `route-intent.ts` (OpenAI `gpt-4o-mini` classifies intent into `book|cancel|reschedule|view_next|faq|unknown`) → matching `flows/` handler. Each flow implements `flow.interface.ts`. Per-phone rate limiting is enforced before any DB access (`PhoneRateLimiter`, 10 req/min default).

### Frontend Routing & Auth
Auth state lives in `useAuth` hook (React Context); `ProtectedRoute` wraps role-gated pages. `useSettings` provides shop-wide config. API calls go through `src/api/apiClient.ts` (Axios instance with `Authorization: Bearer <token>` header). The sidebar hides admin-only nav items based on `user.role`.

### i18n
Both backend and frontend use `i18next`. Backend default locale is `es-DO` (Dominican Spanish), with `en-US` fallback. Chatbot message keys live in `backend/src/locales/`. Frontend locales in `frontend/src/locales/`.

### Google Calendar Integration
OAuth tokens are stored encrypted in SQLite (AES-256 via `src/crypto/`). Pending ops are queued in `gcal_pending_ops` table and replayed by a cron service on renewal. Adapter lives in `src/adapters/google-calendar/`.

## Key Conventions

- **Contract-first**: Update `shared/src/index.ts` before implementing in backend or frontend. Commit shared changes separately.
- **Repository interfaces**: Every SQLite repository must have a matching `*.interface.ts`. Use-cases depend on the interface, never the concrete class — this is what makes unit tests fast.
- **Tests use `:memory:` DB**: `process.env.NODE_ENV === 'test'` triggers an in-memory SQLite instance. No cleanup needed between test files, but each test should create its own data.
- **ADRs for structural decisions**: Use `bash scripts/new-adr.sh "Title"` to scaffold; commit the ADR alongside the code change.
- **No direct DB queries in use-cases**: All DB access goes through repository interfaces injected at construction time.
- **`src/index.ts` is a composition root**: All repository and use-case instantiation happens here; use-cases are stateless and reusable.
