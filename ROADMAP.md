# Barbasys: Operations Management Roadmap

This roadmap defines the architectural vision and feature priorities for the Barbasys Admin System, focusing on operational excellence and system scalability.

## 1. Foundation & Security (Short-Term)
*Goal: Secure the platform and enable granular control over shop resources.*

- **Authentication & Authorization**:
    - Implement JWT-based authentication.
    - Role-Based Access Control (RBAC): `Owner`, `Manager`, `Barber`.
- **Resource Management**:
    - **Service Catalog**: CRUD for services, including duration, price, and required skill level.
    - **Shop Settings**: Configure operating hours, holidays, and shop-wide tax/tip defaults.
- **Enhanced Customer CRM**:
    - Detailed customer profiles (visit history, preferences, contact info).
    - Customer tagging (e.g., "VIP", "Regular").

## 2. Operational Automation (Mid-Term)
*Goal: Reduce manual overhead and improve customer engagement.*

- **Automated Communications**:
    - Real SMS/Email notifications for appointment confirmations and reminders.
    - Digital receipts sent post-sale via the POS.
- **Advanced Scheduling**:
    - Recurring appointments (weekly/monthly slots).
    - Barber shift management (lunch breaks, time-off requests).
- **Inventory Intelligence**:
    - Automated reorder suggestions based on sales velocity.
    - Supplier management and purchase order tracking.

## 3. Analytics & Growth (Long-Term)
*Goal: Provide data-driven insights for business optimization.*

- **Comprehensive Reporting**:
    - Revenue heatmaps (busiest times/days).
    - Barber performance metrics (retention rate, average ticket size, commission payouts).
    - Inventory shrinkage and profitability reports.
- **Financial Integration**:
    - Expense tracking for shop overhead (rent, utilities, supplies).
    - Exportable reports for accounting (CSV/PDF).
- **Scalability**:
    - Multi-shop support (centralized management for multiple locations).
    - Barber-facing mobile portal for personal schedule management.

---
*Maintained by the **Architect** role. Aligning with Clean Architecture and Domain-Driven Design.*
