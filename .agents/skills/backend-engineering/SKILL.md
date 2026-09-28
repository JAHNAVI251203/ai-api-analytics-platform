---
name: backend-engineering
description: Work safely within API Sentinel's Express, PostgreSQL, Redis, BullMQ, Socket.IO, and AI backend.
---

# Backend Engineering — API Sentinel

## Request and data paths

Routes in `src/routes/` delegate to static controller methods. Controllers
coordinate models and services; models contain the PostgreSQL access. Keep this
boundary for new work. `POST /api/logs` is the reference path: it creates an
`api_logs` row, groups 4xx/5xx errors, and emits realtime events.

Return the existing response shapes: successful handlers normally use
`{ success: true, data }`; failures use `{ success: false, error }`. Do not
invent pagination metadata: no current endpoint is paginated. If a new large
collection requires it, propose the contract before implementing it.

## Input and errors

There is no shared validation middleware or global error handler today. New
public input should be checked narrowly and consistently, with appropriate
4xx responses. Keep operational errors server-side and avoid leaking SQL,
webhook payloads, API keys, provider responses, or stack traces.

## PostgreSQL

`src/migrations/init.ts` creates `api_logs`, `error_groups`, `alert_rules`, and
`alert_history`; it uses `SERIAL` primary keys, PostgreSQL timestamps, JSONB
payloads, and indexes for log timestamp/endpoint. Add schema changes there.

Use `pool.query` with `$1`-style parameters. The current analytics models use
time-window SQL; do not expand that pattern to untrusted strings. Prefer a
closed list such as `1 hour`, `6 hours`, `24 hours`, and `7 days` when adding
or modifying range handling.

## Redis, jobs, and realtime

- Redis caches metrics/dashboard/AI outputs and backs rate limits and BullMQ.
  Use readable namespaced keys and intentional TTLs.
- `metrics-calculation` is the only current queue. Its worker handles metrics,
  anomaly detection, cleanup, alerts, and demo data. Make jobs focused and
  retry-safe; do not queue trivial request work.
- The scheduler runs metrics every 5 minutes, anomalies every 10 minutes,
  cleanup daily, alert checks every 2 minutes, and demo data every 30 minutes.
  Treat cadence changes as operational changes.
- Socket clients explicitly join rooms. Preserve the current rooms/events and
  small payloads; add a frontend update in the same change if an event changes.

## AI and alerts

`AIService` calls Gemini first and OpenRouter models as fallback. Keep provider
details there and preserve controller fallback results. `AlertService` sends
webhooks and stores history; tests must not accidentally call real webhook URLs.

## Checklist

- Route, controller, model/service, migration, cache, job, and socket effects reviewed.
- Request values validated and database values parameterized.
- Cache TTL/invalidation and job retry behavior considered.
- External AI/webhook calls not accidentally exercised.
- `npm run build` and the narrowest safe relevant check completed.
