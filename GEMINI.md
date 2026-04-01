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

Every task MUST follow this structured SDLC lifecycle. You may choose between **Sequential** or **Parallel** execution based on task complexity.

### 1. Architect Phase (Sequential & Authoritative)
- **Goal**: Establish the "Source of Truth" before any implementation begins.
- **Contract-First**: Define/update shared interfaces in `shared/src/index.ts`.
- **Mocking Contract**: Define mock data structures (e.g., MSW handlers or Mock API Providers) to decouple Frontend from Backend development.
- **MANDATORY**: Document changes in an ADR if structural.
- **MANDATORY**: Commit all contracts/mocks before transitioning.

### 2. Implementation Phase (Parallel or Sequential)
For complex features, implementation should be parallelized using `generalist` sub-agents:
- **Track A (Backend)**: Implement logic in `backend/src/` against the shared contracts.
- **Track B (Frontend)**: Implement UI in `frontend/src/` using the Mocking Contract for immediate visual feedback.
- **Track C (QA/Testing)**: Develop Unit and E2E tests based on the Architect's specifications.
- **MANDATORY**: Sub-agents must commit their track's work before returning.

### 3. Integration & QA Phase (Sequential - Main Agent Only)
- **Integration**: The Main Agent merges tracks, replaces Mocks with real API calls, and resolves any discrepancies.
- **Validation**: Run project-wide `tsc --noEmit`, `npm run lint`, and the full E2E test suite.
- **MANDATORY**: No task is complete until the Main Agent verifies the "Definition of Done."

### 4. Reviewer Phase
- Final pass for style, naming conventions, and Clean Architecture compliance.
- **MANDATORY**: Final commit of integration fixes and environment cleanup (e.g., `rm -rf backend/dist`).

## Definition of Done

A task is complete ONLY when:
- **Parallel Integration**: Backend, Frontend, and Tests are merged and verified as a single unit.
- **Contract Compliance**: `shared/` contracts are strictly followed by all layers.
- **Project Health**: `tsc` and linting pass for the entire project.
- **Full Verification**: All unit and E2E tests are green.
- **Traceability**: All phases (Architect, Implementation, Integration) result in clean, documented commits.


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

- **Clean Code**: Prioritize **code readability over efficiency**. Choose clear naming, expressive abstractions, and simple logic over premature optimizations or clever "one-liners." Code is for humans to read and machines to execute.
- **Style**: Use TypeScript for all new code. Adhere to Clean Architecture patterns in `backend/src`.
- **Testing**: Add tests for new business logic in both backend and frontend.
- **Validation**: Run `npm run lint` and `tsc --noEmit` before finalizing changes.
