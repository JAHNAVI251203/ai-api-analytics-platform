# API documentation

Dashboard endpoints are public for the local portfolio walkthrough. Time ranges are exact strings: `1 hour`, `6 hours`, `24 hours`, or `7 days`.

## Ingest telemetry

`POST /api/logs` requires `X-API-Key: <INGESTION_API_KEY>` and returns `202 Accepted` when queued.

```json
{
  "event_id": "c74fb38e-8358-4568-8417-7b0e75f85f89",
  "service_name": "demo-scenario",
  "endpoint": "/products",
  "method": "GET",
  "status_code": 200,
  "response_time": 42
}
```

## Read analytics

- `GET /api/dashboard?timeRange=1%20hour`
- `GET /api/metrics?timeRange=24%20hours`
- `GET /api/ai/analyze-errors`
- `GET /api/ai/detect-anomalies`
- `POST /api/demo/run` queues the 20-event demo scenario. It is rate limited and rejects a concurrent run.

AI endpoints only return worker-produced cached output or a pending response.

## Administration

Alert routes and `logs`/`alerts` Socket.IO subscriptions are local demo features without user roles. Webhook targets must be allowlisted HTTPS public hosts.

`GET /health` checks PostgreSQL and Redis and returns `healthy` or `unhealthy`.
