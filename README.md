# API Sentinel

Backend-focused API telemetry and analytics portfolio project.

## Live Demo

- Not deployed yet.
- Run the full local stack with Docker Compose.

## Features

- Real API telemetry ingestion through an API key.
- PostgreSQL analytics, Redis caching, BullMQ background jobs, and Socket.IO updates.
- Dashboard time ranges: last hour, 6 hours, 24 hours, and 7 days.
- Error grouping, webhook alerts, and AI-assisted analysis.
- One dashboard action runs 20 measured Demo API requests with varied endpoints, statuses, and response times.
- No sample rows, fabricated metric inserts, ClickCart integration, Postman dependency, or background traffic remains.

## Architecture

```text
Dashboard action
  -> Demo API scenario
  -> POST /logs with API key
  -> BullMQ telemetry queue
  -> worker transaction
  -> PostgreSQL
  -> Redis cache invalidation and pub/sub
  -> Socket.IO dashboard update
```

- The public dashboard action runs controlled request batches over about 10-15 seconds; it does not insert telemetry directly.
- `event_id` makes telemetry persistence idempotent during BullMQ retries.
- The dashboard starts empty and shows only telemetry produced by actual Demo API requests.

## Tech Stack

- Node.js, TypeScript, Express, React.
- PostgreSQL, Redis, BullMQ, Bull Board, Socket.IO.
- Docker Compose, Gemini, and OpenRouter.

## Installation

1. From `api-analytics`, copy `.env.example` to `.env`.
2. Set `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, and `INGESTION_API_KEY`.
3. Optionally set `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, and `WEBHOOK_ALLOWED_HOSTS`.
4. Start the complete stack:

   ```powershell
   docker compose up --build
   ```

5. Open the dashboard at `http://localhost:3000` and click `Run Demo Scenario`.
6. The Demo API remains available at `http://localhost:3001` for direct endpoint inspection.
7. To intentionally clear legacy telemetry, error groups, and alert history:

   ```powershell
   npm run reset:telemetry
   ```

   This command uses the running API container's PostgreSQL configuration.

## API Documentation

- `POST /logs` accepts telemetry metadata with `X-API-Key` and returns `202 Accepted`.
- `GET /dashboard?timeRange=1%20hour` returns dashboard analytics.
- `POST /demo/run` runs the 20-request portfolio scenario and returns `202 Accepted` after it finishes.
- Valid time ranges are `1 hour`, `6 hours`, `24 hours`, and `7 days`.
- Dashboard, analytics, alerts, and live telemetry are public for the local portfolio walkthrough; only `POST /logs` requires the ingestion API key.
- Full endpoint details are in [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md).

## Alerting System

- Supports error-rate, latency, and traffic-spike rules.
- Alert evaluation runs in BullMQ every two minutes.
- Alert rules and live telemetry are public in this local-only portfolio demo.
- Webhooks require an allowlisted public HTTPS hostname, reject redirects, and time out after ten seconds.

## AI Features

- AI error analysis and dashboard summaries run only in background workers.
- Dashboard reads cached results or a pending response; they never wait for an AI provider.
- Provider calls time out after eight seconds and use fallback behavior.
- One queued AI call produces dashboard summaries and error analysis, then Redis caches both for five minutes.
- Anomaly detection uses the first 10 persisted telemetry events as its baseline and remains a separate background analysis.

## Background Processing

- Telemetry jobs persist events, group errors, clear cache entries, and publish real-time updates.
- A completed scenario queues one delayed, deduplicated summary/error refresh and anomaly refresh; the five-minute schedule is only a fallback.
- Bull Board is available locally at `http://localhost:8000/admin/queues`.

## Dashboard Features

- Request count, latency, success rate, error rate, endpoint, status-code, and error-group views.
- Time range selector for the last hour, 6 hours, 24 hours, and 7 days.
- Public real-time activity feed through Socket.IO.
- Endpoint search, status filtering, CSV export, and AI insights.

## Testing

```powershell
npm run build
npm run test:webhook-policy
npm run test:demo-scenario
npm run test:integration
npm run test:rate
```

- Run `npm run test:integration` against a running API with `INGESTION_API_KEY` set.
- Build the frontend separately from `api-dashboard` with `npm run build`.

## Deployment

- Run the API and worker as separate services with the same PostgreSQL and Redis instances.
- Keep PostgreSQL and Redis private; expose only the API and dashboard.
- Store secrets in the deployment platform's secret manager.
- Use managed PostgreSQL and Redis, private networking, a load balancer, and centralized logs when deploying to AWS.

## Monitoring

- `GET /health` verifies PostgreSQL and Redis connectivity.
- Bull Board exposes local telemetry and scheduled-job state.
- Redis caches short-lived dashboard data and carries worker-to-API real-time events.
- PostgreSQL is the durable telemetry source of truth.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Database schema](docs/DATABASE_SCHEMA.md)
- [API documentation](docs/API_DOCUMENTATION.md)
- [Deployment guide](docs/DEPLOYMENT.md)

## Author

- Jahnavi Satish
- Built to demonstrate practical backend engineering, real-time systems, PostgreSQL, Redis, BullMQ, AI analytics, Docker, and future AWS operations.
