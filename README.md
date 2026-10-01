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
- No sample data, fabricated metrics, automated traffic, ClickCart integration, or Postman dependency.

## Architecture

```text
Manual Demo API request
  -> POST /logs with API key
  -> BullMQ telemetry queue
  -> worker transaction
  -> PostgreSQL
  -> Redis cache invalidation and pub/sub
  -> Socket.IO dashboard update
```

- A user creates requests through the Demo API browser page; it does not create traffic automatically.
- `event_id` makes telemetry persistence idempotent during BullMQ retries.
- The dashboard starts empty and shows only telemetry produced by actual Demo API requests.

## Tech Stack

- Node.js, TypeScript, Express, React.
- PostgreSQL, Redis, BullMQ, Bull Board, Socket.IO.
- Docker Compose, Gemini, and OpenRouter.

## Installation

1. From `api-analytics`, copy `.env.example` to `.env`.
2. Set `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `JWT_SECRET`, `INGESTION_API_KEY`, and `ADMIN_EMAIL`.
3. Optionally set `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, and `WEBHOOK_ALLOWED_HOSTS`.
4. Start the complete stack:

   ```powershell
   docker compose up --build
   ```

5. Open the dashboard at `http://localhost:3000` and the Demo API at `http://localhost:3001`.
6. Use the Demo API links or form to generate real telemetry.
7. To intentionally clear legacy telemetry, error groups, and alert history:

   ```powershell
   npm run reset:telemetry
   ```

## API Documentation

- `POST /logs` accepts telemetry metadata with `X-API-Key` and returns `202 Accepted`.
- `GET /dashboard?timeRange=1%20hour` returns dashboard analytics.
- Valid time ranges are `1 hour`, `6 hours`, `24 hours`, and `7 days`.
- Dashboard and analytics endpoints require a JWT.
- Full endpoint details are in [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md).

## Alerting System

- Supports error-rate, latency, and traffic-spike rules.
- Alert evaluation runs in BullMQ every two minutes.
- Alert rules, Bull Board, and raw live telemetry require the configured `ADMIN_EMAIL` account.
- Webhooks require an allowlisted public HTTPS hostname, reject redirects, and time out after ten seconds.

## AI Features

- AI error analysis and dashboard summaries run only in background workers.
- Dashboard reads cached results or a pending response; they never wait for an AI provider.
- Provider calls time out after eight seconds and use fallback behavior.
- Anomaly detection reports `collecting_baseline` until seven days of real historical telemetry are available.

## Background Processing

- Telemetry jobs persist events, group errors, clear cache entries, and publish real-time updates.
- Scheduled jobs calculate metrics, evaluate alerts, summarize all dashboard ranges, detect anomalies, and clean logs older than 30 days.
- Bull Board is available at `http://localhost:8000/admin/queues` for the admin account.

## Dashboard Features

- Request count, latency, success rate, error rate, endpoint, status-code, and error-group views.
- Time range selector for the last hour, 6 hours, 24 hours, and 7 days.
- Real-time activity feed for the admin account through Socket.IO.
- Endpoint search, status filtering, CSV export, and AI insights.

## Testing

```powershell
npm run build
npm run test:webhook-policy
npm run test:admin-auth
npm run test:integration
npm run test:rate
```

- Run `npm run test:integration` against a running API with `INGESTION_API_KEY` set.
- Build the frontend separately from `api-dashboard` with `npm run build`.

## Deployment

- Run the API and worker as separate services with the same PostgreSQL and Redis instances.
- Keep PostgreSQL and Redis private; expose only the API and dashboard.
- Store secrets in the deployment platform’s secret manager.
- Use managed PostgreSQL and Redis, private networking, a load balancer, and centralized logs when deploying to AWS.

## Monitoring

- `GET /health` verifies PostgreSQL and Redis connectivity.
- Bull Board exposes telemetry and scheduled-job state.
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
