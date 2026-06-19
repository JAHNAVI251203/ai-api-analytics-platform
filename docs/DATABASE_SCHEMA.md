# Database Schema

## Overview

The platform uses PostgreSQL as its primary database for storing API logs, error analytics, alert configurations, and monitoring history.

---

# Entity Relationship Overview

```text
api_logs
    │
    ├── Dashboard Analytics
    ├── Error Analysis
    └── Anomaly Detection

error_groups
    │
    └── Gemini AI Analysis

alert_rules
    │
    ▼
alert_history
```

---

# Tables

## api_logs

Stores API request and response metrics.

### Purpose

- API monitoring
- Performance tracking
- Dashboard analytics
- Error detection
- Anomaly detection

### Columns

| Column | Type | Description |
|----------|----------|-------------|
| id | SERIAL | Primary key |
| endpoint | VARCHAR | API endpoint |
| method | VARCHAR | HTTP method |
| status_code | INTEGER | Response status code |
| response_time | INTEGER | Response time (ms) |
| timestamp | TIMESTAMP | Request timestamp |

### Example

```json
{
  "id": 1,
  "endpoint": "/users",
  "method": "GET",
  "status_code": 200,
  "response_time": 120,
  "timestamp": "2026-06-19T10:00:00Z"
}
```

### Used By

- DashboardController
- MetricsController
- Anomaly Detection Jobs
- Real-Time Analytics

---

## error_groups

Stores grouped application errors.

### Purpose

- Error categorization
- Error frequency tracking
- AI-powered analysis
- Historical error monitoring

### Columns

| Column | Type | Description |
|----------|----------|-------------|
| id | SERIAL | Primary key |
| error_message | TEXT | Error description |
| occurrence_count | INTEGER | Number of occurrences |
| first_seen | TIMESTAMP | First occurrence |
| last_seen | TIMESTAMP | Most recent occurrence |

### Example

```json
{
  "id": 1,
  "error_message": "Database connection timeout",
  "occurrence_count": 24,
  "first_seen": "2026-06-18T08:00:00Z",
  "last_seen": "2026-06-19T10:15:00Z"
}
```

### Used By

- AIController
- AIService
- Gemini AI Analysis

---

## alert_rules

Stores monitoring rules configured by users.

### Purpose

- Error-rate monitoring
- Latency monitoring
- Webhook notifications
- Threshold evaluation

### Columns

| Column | Type | Description |
|----------|----------|-------------|
| id | SERIAL | Primary key |
| name | VARCHAR | Alert name |
| condition_type | VARCHAR | Alert condition |
| threshold | FLOAT | Trigger threshold |
| time_window | VARCHAR | Monitoring period |
| webhook_url | TEXT | Notification endpoint |
| is_active | BOOLEAN | Rule status |
| created_at | TIMESTAMP | Creation timestamp |

### Example

```json
{
  "id": 1,
  "name": "High Error Rate",
  "condition_type": "error_rate",
  "threshold": 5,
  "time_window": "1 hour",
  "webhook_url": "https://webhook.site/example",
  "is_active": true
}
```

### Used By

- AlertController
- AlertService
- BullMQ Alert Jobs

---

## alert_history

Stores triggered alert events.

### Purpose

- Alert tracking
- Monitoring audit trail
- Notification history

### Columns

| Column | Type | Description |
|----------|----------|-------------|
| id | SERIAL | Primary key |
| rule_id | INTEGER | Related alert rule |
| alert_message | TEXT | Triggered message |
| triggered_at | TIMESTAMP | Trigger timestamp |

### Example

```json
{
  "id": 15,
  "rule_id": 1,
  "alert_message": "Error rate exceeded threshold",
  "triggered_at": "2026-06-19T11:00:00Z"
}
```

### Used By

- AlertService
- Webhook Notifications
- Monitoring Dashboard

---

# Data Flow

## Log Processing

```text
POST /api/logs
        │
        ▼
    api_logs
        │
        ▼
 Dashboard Analytics
```

---

## AI Analysis

```text
error_groups
      │
      ▼
 Gemini AI
      │
      ▼
Recommendations
```

---

## Alert Processing

```text
alert_rules
      │
      ▼
BullMQ Jobs
      │
      ▼
Threshold Check
      │
      ▼
alert_history
      │
      ▼
Webhook Notification
```

---

# Performance Optimizations

## PostgreSQL Indexing

Indexes are used on frequently queried fields:

- timestamp
- endpoint
- status_code

Benefits:

- Faster dashboard queries
- Faster analytics aggregation
- Improved filtering performance

---

# Background Processing Integration

BullMQ jobs interact with PostgreSQL for:

- Metrics aggregation
- Alert evaluation
- Anomaly detection
- Historical analytics

---

# Related Documentation

```text
README.md
API_DOCUMENTATION.md
DEPLOYMENT.md
```