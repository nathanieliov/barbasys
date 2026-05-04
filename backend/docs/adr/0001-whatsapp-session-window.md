# ADR 0001: WhatsApp Session Window and Messaging Strategy

## Status
Accepted

## Context
BarbaSys needs to determine when it's appropriate to send customer notifications via WhatsApp versus fallback channels (SMS/Email). WhatsApp has stricter message delivery windows and template requirements from Meta.

## Decision
Implement a 24-hour "session window" concept: customers who have sent at least one message to the chatbot in the last 24 hours are considered "in session," allowing for flexible messaging beyond WhatsApp's standard templates.

### Key Decisions:
1. **Session Definition**: A customer is in-session if their `last_inbound_at` timestamp is within 24 hours
2. **Messaging Priority**: WhatsApp > Email > SMS (when customer is in-session)
3. **Implicit Opt-In**: Customers automatically opt-in to WhatsApp when they send their first message
4. **Fallback Strategy**: If WhatsApp fails, cascade to email; if email fails, fall back to SMS

## Rationale
- **24-hour window** aligns with WhatsApp's messaging policy and typical user engagement patterns
- **Implicit opt-in** maximizes adoption without friction (no explicit user choice needed)
- **Cascading fallback** ensures message delivery with graceful degradation

## Consequences
- Positive: Higher message delivery rates for engaged customers
- Positive: Simplified opt-in flow improves user experience
- Negative: Customers who haven't messaged in 24+ hours won't receive WhatsApp notifications
- Negative: Requires tracking `last_inbound_at` per conversation

## Files Affected
- `src/use-cases/chatbot/session-window.ts` - Session window calculation
- `src/repositories/customer-repository.interface.ts` - `setWaOptIn()` method
- `src/use-cases/chatbot/resolve-customer.ts` - Implicit opt-in on customer creation
- `src/communication.ts` - Cascading notification logic
