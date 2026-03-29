---
name: domain-expert
description: Expert domain knowledge for Barbasys management system. Use to validate business logic in POS, Scheduling, and Inventory.
---

# Domain Expert: Barbasys

This skill provides expert knowledge of the Barbasys business domains, ensuring that all implementations align with the core business rules.

## Domains

### 1. POS (Point of Sale)
- **Mixed Carts**: Must support both services (e.g., haircut) and products (e.g., pomade) in the same transaction.
- **Tips**: Should be recorded and associated with the barber performing the service.
- **Discounts**: Can be applied to specific items or the entire cart.
- **Integration**: Must link check-ins from the scheduling system to POS transactions.

### 2. Scheduling
- **Conflict Detection**: No barber can have two overlapping appointments.
- **Status Management**: Support statuses like "Pending", "Confirmed", "Checked-in", and "Completed".
- **Daily View**: Prioritize daily schedule visibility for quick check-ins.

### 3. Inventory
- **Stock Tracking**: Automate deduction of stock when products are sold via POS.
- **Low-Stock Alerts**: Monitor inventory levels and trigger alerts when below defined thresholds.
- **Audit Logs**: Maintain a history of all stock adjustments (manual restocking, sales, etc.).

### 4. Barber Management
- **Commission Rates**: Each barber has a specific commission rate for services and potentially products.
- **Shift Validation**: Ensure appointments fall within the barber's scheduled shifts.

## Guidelines
- Always verify if a change affects more than one domain (e.g., a POS sale affecting Inventory).
- Ensure that commission calculations follow the specific rules defined for each barber.
- When designing new features, check for edge cases like "no-shows" or "refunds".
