# ADR 0004: 180-Day Data Retention and Purge Policy

## Status
Accepted

## Context
BarbaSys stores conversation histories and messages from customers. For privacy, compliance, and storage efficiency, we need a retention policy that automatically deletes old data.

## Decision
Implement a **180-day retention policy** for conversations and messages:
- **Retention Period**: 180 days from creation
- **Scope**: `conversations` and `wa_messages` tables
- **Automation**: Nightly cron job at scheduled time
- **Cascade**: Database cascade rules handle related record cleanup

### Key Decisions:
1. **180-day threshold**: Balances privacy with reasonable historical context
2. **Conversation-based deletion**: Deletes entire conversations + all associated messages
3. **Created_at timestamp**: Uses record creation time, not last activity
4. **Cascade delete**: Database foreign keys ensure referential integrity

## Rationale
- **180 days** (~6 months) provides reasonable history for dispute resolution and analytics
- **Conversation scope** ensures we don't orphan messages
- **Nightly automation** prevents manual oversight
- **Database cascade** ensures no orphaned records

## Consequences
- Positive: GDPR/privacy compliance (right to be forgotten after 6 months)
- Positive: Reduces database size over time
- Positive: Automatic - no manual intervention needed
- Negative: Deleted conversations cannot be recovered
- Negative: Requires cron job monitoring
- Negative: Batch deletes may impact query performance during execution

## Implementation Details
- Cron job runs: Daily (time configurable via environment)
- Deletion logic: `DELETE FROM conversations WHERE created_at < DATE_SUB(NOW(), INTERVAL 180 DAY)`
- Metrics: Logs deleted conversation and message counts
- Error handling: Logs errors but continues execution (graceful degradation)

## Future Improvements
- Add soft delete with `deleted_at` timestamp for recovery window
- Implement archive export before deletion for compliance/audit
- Add configurable retention period per shop
- Add monitoring/alerting for large batch deletions

## Files Affected
- `src/use-cases/retention/purge-old-data.ts` - Purge logic
- Cron job setup: To be added in Phase 10 (infrastructure as code)
