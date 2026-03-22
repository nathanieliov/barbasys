# Clean Architecture in Node.js

## Core Principles

- **Separation of Concerns**: Divide the software into layers (Domain, Use Cases, Interfaces/Adapters, Infrastructure).
- **Dependency Rule**: Source code dependencies must point only inward, toward higher-level policies.

## Backend Guidelines
- **Domain Entities**: Encapsulate the most general and high-level rules. Do not depend on any framework or database.
- **Use Cases / Interactors**: Application-specific business rules. Do not depend on the UI or DB.
- **Controllers / Adapters**: Convert data from the format most convenient for the use cases to the format most convenient for external agencies (e.g., Express.js, external APIs).
- **Infrastructure**: The outermost layer. Frameworks, databases, external tools (e.g., TypeORM, Knex, Axios).

## Frontend Guidelines (React/Node.js ecosystem)
- **Domain Layer**: Core business models and types.
- **Application Layer**: Custom hooks, state management (e.g., Redux, Context API, Zustand) that implement use cases.
- **UI Layer**: React components. Keep them "dumb" and focused on presentation. They should not contain business logic.
- **Infrastructure Layer**: API clients, local storage wrappers.
