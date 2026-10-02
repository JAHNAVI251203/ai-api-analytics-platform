# API documentation

Dashboard endpoints are public for the local portfolio walkthrough. Time ranges are exact strings: `1 hour`, `6 hours`, `24 hours`, or `7 days`.

## Ingest telemetry

`POST /logs` requires `X-API-Key: <INGESTION_API_KEY>` and returns `202 Accepted` when queued.

```json
{
  "event_id": "c74fb38e-8358-4568-8417-7b0e75f85f89",
  "service_name": "demo-api",
  "endpoint": "/products",
  "method": "GET",
  "status_code": 200,
  "response_time": 42
}
```

## Read analytics

- `GET /dashboard?timeRange=1%20hour`
- `GET /metrics?timeRange=24%20hours`
- `GET /dashboard/search-endpoints?search=products&timeRange=7%20days&statusFilter=2xx`
- `GET /ai/analyze-errors`
- `GET /ai/detect-anomalies`
- `POST /demo/run` runs the 20-request Demo API scenario. It is rate limited and rejects a concurrent run.

AI endpoints only return worker-produced cached output or a pending response.

## Administration

Alerts, `/admin/queues`, and `logs`/`alerts` Socket.IO subscriptions are local demo features without user roles. Webhook targets must be allowlisted HTTPS public hosts.

`GET /health` checks PostgreSQL and Redis and returns `healthy` or `unhealthy`.
