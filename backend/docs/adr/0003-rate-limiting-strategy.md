# ADR 0003: Per-Phone Rate Limiting Strategy

## Status
Accepted

## Context
BarbaSys chatbot receives inbound messages from customers via WhatsApp. We need protection against abuse (spam, brute force attempts) while maintaining good user experience for legitimate customers.

## Decision
Implement **in-memory, per-phone rate limiting** with these parameters:
- **Limit**: 10 messages per phone per 60-second window
- **Storage**: In-memory Map with TTL-based cleanup
- **Rejection**: Throw error when limit exceeded (caught by route handler)

### Key Decisions:
1. **In-Memory Storage**: Fast, simple, no external dependencies
2. **Sliding Window**: Track first request time per phone, reset when window expires
3. **Cleanup**: Periodic cleanup removes expired entries
4. **Error Handling**: Rate limit violations throw errors (handled by Express error middleware)

## Rationale
- **In-memory** provides sub-millisecond lookup time for high throughput
- **10 req/min** balances protection with reasonable conversation flow
- **Sliding window** implementation is simpler than token bucket
- **Per-phone** granularity prevents one customer from blocking others

## Consequences
- Positive: No database queries needed (high performance)
- Positive: Simple implementation, easy to understand
- Negative: Limits lost on server restart
- Negative: Multi-server deployment requires shared state (future: Redis)
- Negative: Does not persist across instances (single-instance only currently)

## Future Improvements
- Move to Redis for multi-server deployments
- Implement token bucket algorithm for smoother rate limiting
- Add per-customer (not just per-phone) limits for authenticated users
- Add metrics/monitoring for rate limit violations

## Files Affected
- `src/adapters/rate-limiter/phone-rate-limiter.ts` - Rate limiter implementation
- `src/use-cases/chatbot/handle-inbound-message.ts` - Rate limit checking
- `src/routes/chatbot.ts` - Rate limiter initialization (10/60s)
