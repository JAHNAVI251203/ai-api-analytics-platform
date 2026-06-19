# System Architecture

## Database Schema

### api_logs
- Primary table for storing API request logs
- Indexed on timestamp and endpoint
- JSONB columns for flexible request/response storage

### error_groups
- Groups similar errors using MD5 hash
- Tracks occurrence count and timestamps
- Enables efficient error analysis

### alert_rules
- Configurable alerting system
- Supports multiple condition types
- Webhook-based notifications

## Background Jobs

1. **Metrics Calculation** (Every 5 min)
   - Aggregates statistics
   - Caches results in Redis

2. **Anomaly Detection** (Every 10 min)
   - AI-powered analysis
   - Compares against baseline

3. **Cleanup** (Daily at 2 AM)
   - Removes logs >30 days old

## Caching Strategy

- Metrics: 30-60 second TTL
- AI Analysis: 5-10 minute TTL
- Dashboard: 1 minute TTL

## Performance Considerations

- Connection pooling for PostgreSQL
- Redis for hot data
- Indexes on frequently queried columns
- Background job processing for heavy operations