# ADR 003: Comprehensive Booking Flow Contracts and Testing Strategy

## Context
The booking flow has encountered multiple issues ranging from state resets during login to incorrect availability calculations and security vulnerabilities (staff login via OTP). While partial fixes were applied, a more robust and tested solution is required to ensure long-term stability.

## Decision
1.  **Contract-First Development**: All booking-related data structures are now formalized in `shared/src/index.ts`. This includes multi-service support, duration tracking, and recurring appointment fields.
2.  **Explicit Availability Endpoint**: A dedicated `GetAvailableSlots` use case and API endpoint are established to decouple frontend display logic from backend conflict detection.
3.  **Tiered Testing Strategy**:
    -   **Backend Unit Tests**: Exhaustive coverage of `GetAvailableSlots` and `CreateAppointment` handling edge cases (shifts, time-offs, overlapping appointments, timezone parsing).
    -   **Frontend Unit Tests**: Verification of `BookingFlow` component state, cart management, and conditional step transitions.
4.  **Role Restriction**: OTP login is strictly reserved for the `CUSTOMER` role to prevent staff account leakage through the public portal.

## Consequences
-   Any changes to appointment logic must first be updated in `shared/`.
-   Increased build time due to more tests, but significantly reduced regression risk.
-   Better developer experience when working on the frontend as the contracts are now clear.
