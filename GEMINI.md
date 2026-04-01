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

Every task MUST follow this structured SDLC lifecycle, as defined in \`workflow.toml\`. You must explicitly state your transition between these phases.

1. **Architect Phase**: 
   - Research requirements and analyze existing code.
   - Define the technical strategy and design.
   - **MANDATORY**: Document changes in an ADR if structural.
   - **MANDATORY**: Define/update shared interfaces in \`shared/src/index.ts\` before implementation.

2. **Engineer Phase**:
   - **Engineer-Backend**: Implement logic in \`backend/src/\`. Adhere to Clean Architecture.
   - **Engineer-Frontend**: Implement UI in \`frontend/src/\`. Ensure responsiveness.
   - **MANDATORY**: Follow project style and responsiveness requirements.
   - **MANDATORY**: Commit all logic changes at the end of this phase before moving to QA.

3. **QA Phase**:
   - **QA-Unit**: Validate logic via automated unit tests for backend and frontend.
   - **QA-E2E**: Verify critical flows with Playwright smoke tests.
   - **MANDATORY**: No task is complete without passing all tests and verifying requirements manually.

4. **Reviewer Phase**:
   - Perform a final self-review or call the \`generalist\` sub-agent to act as a reviewer.
   - Verify consistency, naming conventions, and adherence to local patterns.
   - **MANDATORY**: Run \`tsc --noEmit\` and \`npm run lint\` to ensure project-wide health.
   - **MANDATORY**: Commit any final adjustments or "Reviewer feedback" fixes.

## Definition of Done

A task is complete ONLY when:
- Backend logic is unit tested and adheres to Clean Architecture.
- Frontend UI is implemented, responsive, and navigated.
- **MANDATORY**: Shared contracts are used for type-safety across boundaries.
- **MANDATORY**: \`tsc\` and linting pass for the entire project.
- **MANDATORY**: All changes are committed with a clear message.
- **MANDATORY**: All tests (Unit & E2E) are green.
- **MANDATORY**: Environment is clean (e.g., \`rm -rf backend/dist\`).

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
