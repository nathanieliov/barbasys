# ADR 002: Implementation of JWT-Based Authentication and Role-Based Access Control (RBAC)

## Status
Proposed

## Context
The Barbasys system currently lacks any form of security or user identity. All operations are open to anyone with access to the API or frontend. To move towards a production-ready admin system, we need a secure way to identify users and restrict access to sensitive operations (e.g., managing barbers, viewing financial reports).

## Decision
We will implement a stateless authentication system using JSON Web Tokens (JWT) and a Role-Based Access Control (RBAC) model.

### 1. Identity Management
- Create a `User` entity that handles authentication concerns.
- Decouple `User` from `Barber` (a User *may* be linked to a Barber).
- Roles:
    - **OWNER**: Full system access, including financial reports and multi-shop settings (future).
    - **MANAGER**: Full access to daily operations (POS, Inventory, Schedule) and barber management.
    - **BARBER**: Access to their own schedule and personal performance metrics.

### 2. Technology Choice
- **JWT**: For stateless, scalable authentication.
- **bcryptjs**: For secure password hashing.
- **jsonwebtoken**: For token signing and verification.

### 3. Workflow
- **Login**: User provides credentials -> System verifies password -> System returns a signed JWT.
- **Protected Routes**: Frontend sends JWT in the `Authorization: Bearer <token>` header -> Backend middleware verifies token and attaches user object to the request.
- **Authorization**: Middleware checks if the user's role has permission for the specific action.

## Consequences
- **Positive**:
    - Secure access to sensitive operations.
    - Improved auditability (we know who performed which action).
    - Foundation for multi-user and multi-tenant scaling.
- **Neutral**:
    - Added complexity in the API layer.
    - Frontend must manage token storage (localStorage/cookies) and expiration.
- **Negative**:
    - No native "logout" mechanism without token blacklisting or short TTLs.

---
*Maintained by the **Architect** role. Aligning with Clean Architecture.*
