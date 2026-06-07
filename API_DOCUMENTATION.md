# API Analytics Platform - API Documentation

## Base URL
`http://localhost:3000/api`

## Endpoints

### 1. Log Ingestion
**POST** `/logs`

Request:
{
  "endpoint": "/api/users",
  "method": "GET",
  "status_code": 200,
  "response_time": 150,
  "request_body": {},
  "response_body": {}
}

### 2. Metrics
**GET** `/metrics?timeRange=1 hour`

### 3. Dashboard
**GET** `/dashboard?timeRange=1 hour`

### 4. AI Analysis
**GET** `/ai/analyze-errors`
**GET** `/ai/detect-anomalies`

### 5. Alerts
**POST** `/alerts/rules`
**GET** `/alerts/rules`

... (complete all endpoints)