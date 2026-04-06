# ADR 004: Appointment Cancellation Support

## Context
Users currently cannot cancel their own appointments via the portal. Staff (Barbers/Admins) can cancel appointments via direct database/legacy logic, but it lacks a formal use case and automatic customer notification.

## Decision
1.  **CancelAppointment Use Case**: Create a central use case `CancelAppointment` in the backend to handle cancellation logic.
2.  **Role-Based Rules**:
    -   **CUSTOMER**: Can only cancel their own future appointments (start\_time > now).
    -   **BARBER/ADMIN/OWNER**: Can cancel any appointment.
3.  **Notifications**: When an appointment is cancelled by a staff member, the system must send an automated email notification to the customer.
4.  **API Endpoint**: Expose `POST /api/appointments/:id/cancel`.
5.  **UI Updates**:
    -   "My Bookings" (Frontend): Show "Cancel" button for future appointments.
    -   Staff "Schedule" (Frontend): Add "Cancel" option to appointment details.

## Consequences
-   Improved user autonomy for customers.
-   Enhanced communication when staff changes the schedule.
-   Requires coordination between the cancellation logic and the notification service.
