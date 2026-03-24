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

## Git Workflow (MANDATORY)

- **Atomic Commits**: Each logical change (feature, bug fix, refactor) must be in its own small commit. No "big bang" commits.
- **Commit Messages**: Use clear, descriptive messages (e.g., `feat: add barber shift validation`, `fix: correct daily report commission calculation`).
- **Safety**: Never commit `.env` or database files.

## Guidelines

- **Style**: Use TypeScript for all new code. Adhere to Clean Architecture patterns in `backend/src`.
- **Testing**: Add tests for new business logic in both backend and frontend.
- **Validation**: Run `npm run lint` and `tsc --noEmit` before finalizing changes.
