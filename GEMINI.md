# Barbasys Project

A comprehensive management system for barbershops, featuring a robust backend for operations and a React-based frontend for administrative tasks.

## Project Structure

- **backend/**: Node.js/TypeScript backend following Clean Architecture principles.
  - `src/domain/`: Core entities and business rules.
  - `src/use-cases/`: Orchestration logic for specific features.
  - `src/repositories/`: Data access abstractions and SQLite implementations.
  - `src/db.ts`: Database schema definition and initialization (SQLite).
  - `src/index.ts`: API entry point and route handlers.
- **frontend/**: React/TypeScript frontend (Vite).
  - `src/pages/`: Main application views (POS, Schedule, Inventory, Barbers, Reports, Customers).
  - `src/components/`: Reusable UI components.
  - `src/api/`: Frontend API clients.

## Tech Stack

- **Backend**: Node.js, TypeScript, Express, SQLite (`better-sqlite3`).
- **Frontend**: React, TypeScript, Vite, Vanilla CSS, Lucide-react (icons).

## Core Features (Status)

- **POS (Functional)**: Supports mixed carts (services/products), tips, discounts, and integration with the scheduling system for check-ins.
- **Scheduling (Functional)**: Daily view, booking with conflict detection, and status management.
- **Inventory (Functional)**: Stock tracking, low-stock alerts, manual restocking, and audit logs.
- **Barber Management (Functional)**: Team management and commission rate configuration.

## Development Workflow (MANDATORY)

Every task must follow this sequential lifecycle:
1. **Architect Phase**: Research requirements, analyze existing code, and define the technical strategy/design. Document changes in an ADR if structural.
2. **Engineer Phase**: Implement the design using surgical, idiomatic code changes. Follow project style and responsiveness requirements.
3. **QA Phase**: Validate changes via automated tests and manual verification of requirements (e.g., mobile responsiveness).
4. **Reviewer Phase**: Perform a final pass for consistency, naming conventions, and adherence to "Clean Architecture" or local patterns.

Handoff criteria are defined in `workflow.toml`.

## Agentic Workflow & QA Protocol

To ensure high-quality, complete feature deliveries, the following protocol must be followed:

1.  **Build Validation**: After any change to entities, interfaces, or shared logic, always run `npm run build --prefix backend` and `npm run build --prefix frontend` to catch silent type errors.
2.  **Environment Hygiene**: Before running unit tests, ensure the environment is clean by removing the `dist/` directory (e.g., `rm -rf backend/dist`) to avoid running stale compiled tests.
3.  **Multi-Role Verification**: When implementing Role-Based Access Control (RBAC), verify the feature by simulating logins for different roles (e.g., OWNER vs BARBER) via tests or manual checks.
4.  **E2E Mandatory**: Any change to routing, navigation, or critical business flows (POS, Booking) must be verified with a Playwright smoke test (`npx playwright test`).
5.  **Definition of Done**: A task is complete ONLY when:
    *   Backend logic is unit tested.
    *   Frontend UI is implemented and navigated.
    *   `tsc` passes for the entire project.
    *   All tests (Unit & E2E) are green.

## Guidelines

- **Style**: Use TypeScript for all new code. Adhere to Clean Architecture patterns in `backend/src`.
- **Testing**: Add tests for new business logic in both backend and frontend.
- **Validation**: Run `npm run lint` and `tsc --noEmit` before finalizing changes.
