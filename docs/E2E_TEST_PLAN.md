# End-to-End (E2E) Test Plan: BarbaSys

This plan outlines the strategy for verifying the full system functionality from a user's perspective using **Playwright**.

## 1. Test Environment Setup
- **Tool**: Playwright (TypeScript).
- **Database**: Use a temporary SQLite file (`test_barbasys.db`) for each test run to ensure a clean state.
- **Mocks**: 
    - **Communication**: Intercept console logs to verify "Mock Mode" output for Emails/SMS.
    - **Auth**: Pre-seed the DB with an `OWNER` and a `BARBER` user.

## 2. Core Feature Test Suites

### A. Authentication & RBAC
- **Login Flow**: Verify successful login redirects to Dashboard.
- **Access Control**: 
    - Verify `BARBER` cannot access `/analytics` or `/settings`.
    - Verify `OWNER` can access all routes.
- **Multi-Shop Check**: Verify `shop_name` in sidebar matches the user's assigned shop.

### B. POS (Sales) & Communications
- **Mixed Cart**: Add a service and a product, apply a discount and tip.
- **Completion**: Verify sale creates a record in the DB and triggers a mock digital receipt in logs.
- **Inventory Integration**: Verify product stock decreases by exactly 1 unit after a sale.

### C. Advanced Scheduling
- **Shift Enforcement**: 
    - Attempt to book an appointment at 2 AM (Verify error).
    - Attempt to book an appointment during a seeded "Lunch Break" (Verify error).
- **Recurring Series**: 
    - Create a "Weekly" series for 4 weeks.
    - Navigate to future dates and verify all 4 appointments appear.
- **Check-in flow**: Verify clicking "Check-in" pre-fills the POS cart correctly.

### D. Inventory & Intelligence
- **Supplier Link**: Create a new supplier, link it to a product, and verify it appears in the inventory table.
- **Velocity Check**: Seed 10 sales for a product, check the `/api/inventory/intelligence` response for correct `avg_daily_velocity` and "Reorder Suggestion" flag.

### E. Financials & Analytics
- **Expense Logging**: Add a "Maintenance" expense.
- **Profit Calculation**: Navigate to Reports, select "Month", and verify `Net Profit = Revenue - (Commissions + Expenses)`.
- **Heatmap Check**: Verify the hourly analytics bars render with heights proportional to seeded sale data.

## 3. Execution Strategy
1. **Infrastructure**: Install `@playwright/test` in the root.
2. **Setup File**: Create a global setup to seed the initial shop and admin user.
3. **CI Integration**: Add `npm run test:e2e` to the project's future GitHub Actions or local verification pipeline.

---
*Maintained by the **QA** role. Ensuring behavioral correctness across the entire platform.*
