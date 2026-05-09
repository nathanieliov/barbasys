# BarbaSys

Barbershop management platform: appointments, POS, customer portal, and a WhatsApp chatbot for booking. Backend is Node.js + Express + SQLite (better-sqlite3); frontend is React 18 + Vite.

## Verification

Run before opening a PR:

```bash
npm run verify        # full: types + unit + integration + E2E (~3-5 min)
npm run verify:quick  # mid-edit (~30s)
```

See [`TESTING.md`](./TESTING.md) for the verification matrix and how to add new tests.
