# API Documentation

## Base URL

### Production

```text
https://ai-api-analytics-platform-production.up.railway.app
```

### Local Development

```text
http://localhost:8000
```

---

# Authentication

Currently no authentication is required.

Future versions will support API key authentication and role-based access control.

---

# Health Check

## GET /health

Checks application status.

### Request

```http
GET /health
```

### Response

```json
{
  "status": "ok",
  "timestamp": "2026-06-19T12:00:00.000Z"
}
```

---

# Log Ingestion

## POST /api/logs

Stores API request metrics for analytics and monitoring.

### Request

```http
POST /api/logs
```

### Request Body

```json
{
  "endpoint": "/users",
  "method": "GET",
  "statusCode": 200,
  "responseTime": 120
}
```

### Success Response

```json
{
  "success": true,
  "message": "Log stored successfully"
}
```

### Use Cases

- API monitoring
- Performance tracking
- Error analysis
- Dashboard metrics

---

# Dashboard Analytics

## GET /api/dashboard

Returns dashboard analytics data.

### Request

```http
GET /api/dashboard
```

### Query Parameters

| Parameter | Description |
|------------|-------------|
| timeRange | 1h, 6h, 24h, 7d |

### Example

```http
GET /api/dashboard?timeRange=24h
```

### Response

```json
{
  "overallStats": {},
  "endpointStats": [],
  "statusDistribution": [],
  "topErrors": [],
  "timeSeriesData": []
}
```

### Returned Data

- Total requests
- Error rate
- Average latency
- Status code distribution
- Top endpoints
- Time-series analytics

---

# AI Error Analysis

## POST /api/ai/analyze-errors

Uses Gemini AI to analyze collected error data.

### Request

```http
POST /api/ai/analyze-errors
```

### Response

```json
{
  "analysis": "AI-generated error analysis and recommendations."
}
```

### Features

- Root cause analysis
- Error categorization
- Performance recommendations
- Optimization suggestions

### Notes

Results are cached in Redis for 5 minutes to reduce Gemini API usage.

---

# Alert Rules

## POST /api/alerts/rules

Creates a new monitoring rule.

### Request

```http
POST /api/alerts/rules
```

### Request Body

```json
{
  "name": "High Error Rate",
  "condition_type": "error_rate",
  "threshold": 5,
  "time_window": "1 hour",
  "webhook_url": "https://webhook.site/your-url"
}
```

### Success Response

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "High Error Rate",
    "condition_type": "error_rate",
    "threshold": 5,
    "time_window": "1 hour",
    "is_active": true
  }
}
```

---

# Alert Conditions

Supported condition types:

| Condition | Description |
|------------|-------------|
| error_rate | Monitors API error percentage |
| latency | Monitors response time threshold |

---

# Webhook Notifications

When an alert threshold is exceeded:

1. Rule is evaluated by BullMQ worker
2. Alert is triggered
3. Webhook request is sent
4. Alert history is stored

Example webhook payload:

```json
{
  "alert": "High Error Rate",
  "condition": "error_rate",
  "threshold": 5,
  "currentValue": 8.4,
  "timestamp": "2026-06-19T12:00:00Z"
}
```

---

# Real-Time Events

Socket.io is used for live updates.

## Connection

```javascript
const socket = io("http://localhost:8000");
```

---

## Subscribe

```javascript
socket.emit("subscribe", "dashboard");
```

---

## Events

### dashboard:update

Sent when dashboard metrics change.

### metrics:update

Sent when new analytics are available.

### alerts:update

Sent when an alert is triggered.

---

# Queue Monitoring

## GET /admin/queues

Bull Board dashboard for queue monitoring.

### Request

```http
GET /admin/queues
```

### Features

- Active jobs
- Waiting jobs
- Completed jobs
- Failed jobs
- Retry operations
- Queue statistics

---

# Rate Limiting

Rate limiting is enabled to prevent abuse.

### Protected Routes

```text
/api/*
```

### Log Ingestion Route

Additional rate limiting:

```text
/api/logs
```

---

# Error Responses

## 400 Bad Request

```json
{
  "success": false,
  "message": "Invalid request data"
}
```

---

## 404 Not Found

```json
{
  "success": false,
  "message": "Resource not found"
}
```

---

## 429 Too Many Requests

```json
{
  "success": false,
  "message": "Too many requests"
}
```

---

## 500 Internal Server Error

```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

# Postman Collection

A ready-to-use Postman collection is included:

```text
postman_collection.json
```

Import it into Postman to test all available endpoints.

---

# Related Documentation

```text
README.md
DATABASE_SCHEMA.md
DEPLOYMENT.md
```