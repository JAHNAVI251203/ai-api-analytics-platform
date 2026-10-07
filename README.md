# API Sentinel

API Sentinel is a backend-focused API telemetry and analytics platform. It accepts instrumented API events, persists them asynchronously, derives operational views from PostgreSQL, and streams new activity to a React dashboard.

## Demo

- Dashboard: https://ai-api-analytics-dashboard.vercel.app
- Backend: https://ai-api-analytics-platform-production.up.railway.app

## Key Features

### Telemetry and analytics

- API-key-protected `POST /api/logs` ingestion with request-shape validation and a `202 Accepted` queue response.
- Idempotent telemetry persistence using a unique `event_id`, so BullMQ retries do not create duplicate log rows.
- PostgreSQL-backed request counts, success and error rates, latency aggregates, endpoint breakdowns, HTTP status distributions, time series, and per-endpoint p95/p99 queries.
- Error grouping for failed requests using a SHA-256 hash of endpoint, HTTP method, and status code.
- Four supported dashboard windows: `1 hour`, `6 hours`, `24 hours`, and `7 days`.

### Asynchronous and real-time processing

- Dedicated BullMQ telemetry queue and worker with retry/backoff configuration and worker-side database transactions.
- Scheduled jobs for hourly metrics caching, dashboard analysis, anomaly detection, alert evaluation, and 30-day telemetry cleanup.
- Redis-backed, short-lived dashboard and metrics caches that are invalidated after telemetry processing.
- Redis Pub/Sub between worker and API process; Socket.IO then delivers `new-log` and error events to subscribed dashboard clients.

### Analysis and alerting

- Worker-generated dashboard summaries, error analysis, and anomaly detection based on stored telemetry.
- Gemini as the first AI provider, with OpenRouter fallbacks and deterministic local fallbacks when provider calls fail.
- Cached AI results so dashboard reads do not wait for an external provider.
- Alert rules for error-rate, latency, and traffic-spike conditions; webhook delivery has an HTTPS host allowlist, DNS public-address check, redirect rejection, timeout, delivery history, and Redis cooldown.

### Operational safeguards

- Redis-backed rate limits for general API traffic, ingestion traffic, and demo-scenario runs.
- Health endpoint that checks both PostgreSQL and Redis.
- Configurable CORS origins for the HTTP API and Socket.IO server.
- A Docker Compose environment that runs the dashboard, API, worker, PostgreSQL, and Redis together.

## Architecture

```mermaid
flowchart LR
    S[Instrumented API] -->|POST /api/logs + X-API-Key| A[Express API]
    DS[Demo scenario runner] -->|enqueue 20 controlled events| TQ
    A -->|enqueue and return 202| TQ[(BullMQ telemetry-ingestion)]
    TQ --> W[Telemetry worker]
    W -->|transactional write| P[(PostgreSQL)]
    W -->|invalidate cache / publish event| R[(Redis)]
    R -->|realtime:telemetry| A
    A -->|Socket.IO| D[React dashboard]

    MQ[(BullMQ metrics-calculation)] --> MW[Metrics worker]
    MW --> P
    MW --> R
    MW --> AI[Gemini / OpenRouter]
    MW --> WH[Allowlisted HTTPS webhook]
```

1. An instrumented service sends a telemetry event to `POST /api/logs`. The endpoint validates the event, authenticates the ingestion key, applies the ingestion rate limit, and queues the job.
2. The telemetry worker inserts the event only if its `event_id` is new. Failed responses also update the corresponding error group in the same PostgreSQL transaction.
3. The worker clears cached analytics and publishes the persisted event through Redis. The API process subscribes to that channel and emits Socket.IO events to the `logs` and `alerts` rooms.
4. Dashboard and metrics requests read short-lived Redis entries when available; otherwise they query PostgreSQL and cache the computed response.
5. A second queue runs scheduled metrics, AI, alert, and retention work independently of incoming HTTP traffic.

## Tech Stack

| Layer | Technologies in this repository |
| --- | --- |
| Backend | Node.js, TypeScript, Express 5 |
| Persistence | PostgreSQL with `pg` |
| Cache, queues, and rate limits | Redis, ioredis, BullMQ, rate-limit-redis |
| Real-time | Socket.IO and Redis Pub/Sub |
| AI analysis | Gemini with OpenRouter fallbacks |
| Frontend | Separate React + TypeScript dashboard using Axios, Recharts, and Socket.IO Client |
| Local infrastructure | Docker, Docker Compose, Nginx for the dashboard image |
| Checks | TypeScript build and focused Node/`tsx` scripts |

## Backend Deep Dive

### Ingestion and persistence

`POST /api/logs` accepts only a UUID event ID, service name, endpoint, supported HTTP method, valid status code, and non-negative integer response time. Rather than performing the database write inline, the controller adds a named job to `telemetry-ingestion` with up to five attempts and exponential backoff.

The telemetry worker runs with a concurrency of five. It wraps the insert and error-group update in one PostgreSQL transaction. `api_logs.event_id` has a unique index and the insert uses `ON CONFLICT DO NOTHING`, giving retries idempotent persistence semantics.

### Caching and metrics

The dashboard and metrics endpoints cache aggregate responses in Redis for 60 seconds. When a telemetry job completes, the worker invalidates dashboard, metrics, AI-summary, error-analysis, and anomaly keys so the next read reflects new data. A scheduled job also stores the one-hour aggregate for an hour.

PostgreSQL is queried for overall, endpoint, and status-code aggregates. Dashboard time series use generated time buckets, including empty intervals, which lets the UI render a continuous timeline even when no events were recorded in a bucket.

### Rate limiting, alerts, and failures

General API traffic is limited per IP, ingestion is limited per API key (falling back to IP), and demo execution has its own short window. Active alert rules are evaluated by the worker every two minutes. Before a webhook is sent, the target must match `WEBHOOK_ALLOWED_HOSTS`, use HTTPS without credentials or a non-standard port, resolve only to public addresses, and accept no redirects. Redis also applies a 15-minute cooldown per rule.

The API returns scoped JSON errors from controllers and reports infrastructure failures to the server log. There is no global Express error middleware or user-facing authentication/authorization layer in the current implementation; dashboard, analytics, alert, and queue routes are intended for the local portfolio walkthrough.

## AI Integration

AI is a worker subsystem, not part of the synchronous dashboard request path.

- `analyze-dashboard` aggregates endpoint statistics for each supported range plus recent errors, then stores a dashboard summary and error analysis in Redis for five minutes.
- `detect-anomalies` compares the latest ten persisted events with the first ten stored events. Until a ten-event baseline exists, it returns a collection-status response instead of calling a provider.
- Provider calls try Gemini first, then two OpenRouter model options. Each outbound call has an eight-second timeout.
- If providers fail, invalid JSON is returned, or a request cannot be completed, the service produces a deterministic telemetry-based fallback. Read endpoints return a pending or fallback response rather than blocking dashboard analytics.

## API Reference

All dashboard time-range inputs must be one of `1 hour`, `6 hours`, `24 hours`, or `7 days`. Except for ingestion, the routes below are public in the local demo configuration.

| Group | Endpoint | Purpose |
| --- | --- | --- |
| Ingestion | `POST /api/logs` | Queue a validated telemetry event. Requires `X-API-Key`. |
| Dashboard | `GET /api/dashboard?timeRange=1%20hour` | Return overview, endpoint, status, error, time-series, and cached AI-summary data. |
| Dashboard | `GET /api/dashboard/endpoint/:endpoint` | Return per-method aggregates, including p95 and p99 latency. |
| Analytics | `GET /api/metrics`, `GET /api/errors` | Read aggregate metrics or recent grouped errors. |
| AI | `GET /api/ai/analyze-errors`, `GET /api/ai/detect-anomalies` | Read cached or pending worker-produced insights. |
| Alerts | `POST /api/alerts/rules`, `GET /api/alerts/rules`, `POST /api/alerts/test` | Create/list alert rules or trigger an alert evaluation. |
| Operations | `GET /health` | Check PostgreSQL and Redis health. |
| Demo | `POST /api/demo/run` | Run the controlled 20-event demo scenario. |

For event payloads and response examples, see [API documentation](docs/API_DOCUMENTATION.md).

## Database

The executable schema lives in [`src/migrations/init.ts`](src/migrations/init.ts) and is run when the API and worker start.

- `api_logs` is the telemetry source of truth: unique `event_id`, service name, endpoint, method, status code, response time, and timestamp. It is indexed by timestamp and endpoint.
- `error_groups` tracks recurring failed endpoint/method/status combinations, with first/last seen values and an occurrence count.
- `alert_rules` stores active rule definitions; `alert_history` records webhook delivery attempts and their responses.

Telemetry intentionally excludes request/response bodies, client IP addresses, user-agent strings, and API keys.

## Background Jobs

Two BullMQ queues separate latency-sensitive HTTP work from slower processing:

| Queue | Work |
| --- | --- |
| `telemetry-ingestion` | Persist queued events, group errors, invalidate caches, and publish real-time telemetry. |
| `metrics-calculation` | Cache hourly metrics, analyze the dashboard, detect anomalies, evaluate alerts, and delete logs older than 30 days. |

The worker schedules hourly-metric and dashboard-analysis jobs every five minutes, anomaly detection every ten minutes, alert evaluation every two minutes, and retention cleanup daily at 02:00. The demo scenario also queues delayed dashboard-analysis and anomaly-refresh jobs after its events are queued.

## Real-Time Updates

The dashboard connects with Socket.IO and joins `logs` and `alerts` rooms. Once a telemetry event is persisted, the worker publishes it on Redis; the Express process relays `new-log` to the `logs` room and `error-alert` to the `alerts` room for failed requests. The dashboard keeps a short live-activity list and schedules a dashboard refresh after received events.

## Repository Layout

The application is split into two sibling Git repositories. This README belongs to the backend repository.

```text
api-analytics/                         # backend repository
├── src/
│   ├── config/                         # PostgreSQL and Redis clients
│   ├── controllers/                    # HTTP orchestration
│   ├── jobs/                           # BullMQ queues, workers, schedules
│   ├── middleware/                     # ingestion auth and rate limits
│   ├── migrations/                     # executable PostgreSQL schema
│   ├── models/                         # SQL-backed telemetry, metrics, alerts
│   ├── routes/                         # Express route definitions
│   ├── services/                       # AI, cache, webhook, real-time services
│   ├── server.ts                       # HTTP, Socket.IO, rate limits, health
│   └── worker.ts                       # background worker entry point
├── docs/                               # architecture, API, schema, deployment notes
├── docker-compose.yml                  # full local stack
└── Dockerfile

../api-dashboard/                       # separate React dashboard repository
├── src/components/                     # dashboard, charts, metrics, AI panels
├── src/services/api.ts                 # HTTP client
└── Dockerfile
```

## Getting Started

### Prerequisites

- Docker Desktop with Docker Compose
- Node.js 18+ and npm only if running either repository outside Docker

### Run the complete local stack

Place the two repositories beside one another as shown above. The backend Compose file builds the dashboard from `../api-dashboard`, so that sibling path is required.

From `api-analytics`:

```powershell
Copy-Item .env.example .env
```

Set at least the required values in `.env`; use your own secrets and do not commit this file.

```env
POSTGRES_PASSWORD=choose_a_local_postgres_password
REDIS_PASSWORD=choose_a_local_redis_password
INGESTION_API_KEY=choose_a_long_random_ingestion_key

# Optional configuration
CORS_ORIGIN=http://localhost:3000
WEBHOOK_ALLOWED_HOSTS=hooks.example.com
GEMINI_API_KEY=your_gemini_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
```

For non-Docker backend processes, also set the connection variables from [`.env.example`](.env.example):

```env
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
REDIS_URL=redis://:password@localhost:6379
PORT=8000
```

Start the stack:

```powershell
docker compose up --build
```

Compose starts PostgreSQL, Redis, the API, the worker, and the frontend. Migrations run during API and worker startup. Open:

- Dashboard: `http://localhost:3000`
- API and health check: `http://localhost:8000/health`

Select **Run Demo Scenario** in the dashboard to queue 20 controlled telemetry events. The worker still owns durable writes, error grouping, cache invalidation, and realtime publication; the scenario does not insert telemetry directly into the database.

### Run services outside Docker

Run PostgreSQL and Redis first, set `DATABASE_URL` and `REDIS_URL`, then start the API and worker as separate processes:

```powershell
# api-analytics
npm install
npm run dev

# a second api-analytics terminal; build before running the compiled worker
npm run build
npm run worker
```

To run the dashboard outside Compose, configure `REACT_APP_API_URL` as `http://localhost:8000/api` and `REACT_APP_SOCKET_URL` as `http://localhost:8000` in [`../api-dashboard/.env.example`](../api-dashboard/.env.example), then run `npm install` and `npm start` from `api-dashboard`.

### Reset local telemetry

With the Compose stack running, the following command truncates telemetry, grouped errors, and alert history. It is intended only for resetting local demo data.

```powershell
npm run reset:telemetry
```

## Testing and Verification

The backend uses focused scripts rather than a single test-runner command:

```powershell
npm run build                 # TypeScript compilation
npm run test:webhook-policy   # webhook URL allowlist policy checks
npm run test:demo-scenario    # verifies the controlled scenario shape
npm run test:integration      # requires a running API and INGESTION_API_KEY
npm run test:rate             # sends local traffic to /api/metrics for rate-limit inspection
```

The dashboard repository also exposes the standard Create React App `npm test` and `npm run build` commands.

## Deployment Notes

The provided deployment artifact is the Docker Compose stack. Its API and worker are separate containers that share PostgreSQL and Redis; the frontend image is built with Nginx.

For any hosted deployment, keep PostgreSQL and Redis private, run the API and worker as independent services with the same connection settings, configure `CORS_ORIGIN` for the dashboard origin, and store `INGESTION_API_KEY`, provider keys, and webhook allowlists in the platform secret manager.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Database schema](docs/DATABASE_SCHEMA.md)
- [API documentation](docs/API_DOCUMENTATION.md)
- [Deployment guide](docs/DEPLOYMENT.md)

## Author 

Built by Jahnavi S
