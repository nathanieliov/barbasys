# ADR: Transition to Clean Architecture

## Title
Transitioning Barbasys Backend and Frontend to Clean Architecture

## Status
Proposed

## Context
The current codebase has high coupling between business logic, data access, and interface layers.
- `backend/src/index.ts` contains all business logic and direct database queries.
- `frontend/src/pages/POS.tsx` handles complex state and API calls directly.
This makes testing difficult and increases the risk of regressions when changing data sources or UI frameworks.

## Decision
We will transition to a Clean Architecture pattern:
1. **Backend**:
   - **Domain Layer**: Define core entities (Barber, Customer, Sale, Appointment) as TypeScript interfaces.
   - **Use Case Layer**: Extract business logic into standalone functions or classes (e.g., `processSale`, `scheduleAppointment`).
   - **Repository Layer**: Abstract database access behind interfaces (e.g., `IBarkerRepository`).
   - **Adapter Layer**: Express controllers will only parse requests and call use cases.
2. **Frontend**:
   - **Infrastructure Layer**: Dedicated API client in `frontend/src/api`.
   - **Application Layer**: Custom React hooks (e.g., `usePOS`, `useInventory`) to encapsulate state and business logic.
   - **UI Layer**: React components will be "dumb" and focus on presentation.

## Consequences
- **Positive**: Improved testability (units can be tested in isolation), better separation of concerns, easier to maintain as the project grows.
- **Negative**: Increased initial complexity and more boilerplate code (files/folders).

## Alternatives Considered
- **Keep as-is**: Not sustainable for long-term growth and feature expansion.
- **MVC Pattern**: Good, but doesn't solve the coupling of business logic to data access as cleanly as Clean Architecture.
