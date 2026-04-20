# ADR 0002: Per-Barber Google Calendar Integration

## Status
Accepted

## Context
BarbaSys needs to integrate with Google Calendar to manage barber availability. Each barber may work at different shops or have independent scheduling needs.

## Decision
Implement a **per-barber Google Calendar integration** where each barber has:
- Independent OAuth 2.0 credentials
- Encrypted refresh token storage (AES-256-GCM)
- Individual watch subscription for real-time calendar updates
- Separate freebusy queries for availability checking

### Key Decisions:
1. **Per-Barber Credentials**: Each barber manages their own Google Calendar OAuth token
2. **Token Encryption**: Refresh tokens encrypted using AES-256-GCM with per-barber encryption keys
3. **Watch Subscription**: Each barber gets a unique channel ID for push notifications
4. **Watch Renewal**: Automatic renewal 24 hours before expiration

## Rationale
- **Per-barber isolation** allows each barber independent control over their calendar
- **Encrypted tokens** protect sensitive credentials from database breaches
- **GCM mode** provides both confidentiality and authentication
- **Automatic renewal** prevents watch expirations from breaking availability checks

## Consequences
- Positive: Barbers own their calendar data and can revoke access independently
- Positive: Scalable to multiple shops/regions without shared infrastructure
- Negative: Requires OAuth flow for each barber (onboarding complexity)
- Negative: Renewal cron job must run regularly
- Negative: Increased database columns per barber

## Files Affected
- `src/adapters/google-calendar/token-cipher.ts` - Token encryption/decryption
- `src/adapters/google-calendar/oauth-flow.ts` - OAuth flow management
- `src/adapters/google-calendar/gcal-client.ts` - Per-barber calendar API calls
- `src/use-cases/calendar/renew-calendar-watches.ts` - Watch renewal automation
- Database schema: barbers table additions for `gcal_token_enc`, `gcal_channel_id`, `gcal_resource_id`, `gcal_watch_expires_at`
