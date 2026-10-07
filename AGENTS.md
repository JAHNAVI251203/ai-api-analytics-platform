# API Sentinel Backend

## Purpose and stack

`api-analytics` is the TypeScript/Express backend for API Sentinel: it ingests
API logs, produces dashboard metrics, groups errors, evaluates alerts, serves
AI analysis, and sends real-time updates. It uses PostgreSQL (`pg`), Redis
(`ioredis`), BullMQ, Socket.IO, Gemini with an OpenRouter fallback, and Docker.

Run commands from this directory; it has its own Git repository and lockfile.

## Current structure

- `src/server.ts` configures Express, CORS, Socket.IO, rate limits,
  migrations, and scheduled jobs.
- `src/routes/` maps paths to controller static methods.
- `src/controllers/` handles HTTP orchestration and `{ success, data }` or
  `{ success: false, error }` responses.
- `src/models/` owns PostgreSQL queries; there is no repository layer.
- `src/services/` contains AI, alerts, realtime emission, and demo-data logic.
- `src/jobs/` defines the `metrics-calculation` queue, worker, and schedules.
- `src/migrations/init.ts` is the executable schema source of truth.
- `scripts/` and `src/tests/` are runnable operational checks, not a test runner.

## Change discipline

Before modifying code:

1. Understand the existing implementation and identify the affected files.
2. Explain the current flow and propose the smallest reasonable change.
3. Wait for approval before large architectural changes.
4. Run the relevant verification after a change.
5. Do not add dependencies without a concrete justification.

Inspect `git status` first and preserve unrelated edits. Do not clean, restore,
or overwrite changes you did not make.

## Backend conventions

- Follow the existing route -> controller -> model/service shape. Keep routes
  declarative; do not put SQL or business logic in them.
- Use the local style of the file being changed. Existing code uses classes with
  static methods, `camelCase` values/methods, `PascalCase` classes/interfaces,
  and relative imports. Keep imports grouped consistently: packages before
  internal modules where practical.
- Preserve endpoint paths and the established JSON response shape unless a
  coordinated API contract change is intentional. Current AI analysis routes
  are `GET`; `summarize-logs` is `POST`.
- Validation and centralized error middleware are not currently implemented.
  Do not claim they exist. For new public inputs, add focused validation in the
  smallest appropriate layer and return safe client errors; do not expose DB,
  provider, or stack details.
- Use parameterized `pg` values. Never interpolate request input into SQL.
  Existing interval strings are interpolated; when touching those paths, treat
  time ranges as an explicit allowlist before they reach SQL.
- Keep schema changes in `src/migrations/init.ts` and align models, docs, and
  scripts. The current schema uses PostgreSQL `SERIAL` IDs and timestamps such
  as `timestamp`, `first_seen`, `last_seen`, and `triggered_at`.
- Redis is cache/rate-limit/queue infrastructure, not the durable source of
  truth. Follow the existing key naming (`metrics:`, `dashboard:`, `ai:`,
  `rl:`), set a deliberate TTL, and consider invalidation after writes.
- Add BullMQ work only when it should not block an HTTP response. Keep worker
  cases named, observable, and safe to retry; do not change cron cadence or
  retention cleanup without approval.
- Preserve Socket.IO rooms and event contracts (`logs`/`new-log`,
  `alerts`/`error-alert`, and `metrics`/`metrics-update`) across backend and
  dashboard changes.
- Keep Gemini/OpenRouter calls isolated in `AIService`. Preserve graceful
  fallback responses so unavailable AI does not break core analytics.
- Keep credentials in `.env`; never log, commit, or return `DATABASE_URL`,
  `REDIS_URL`, `GEMINI_API_KEY`, or `OPENROUTER_API_KEY`.

## Commands and verification

- `npm run build` — TypeScript build.
- `npm run test:rate` — local rate-limit traffic check.
- `npm run test:integration` — currently targets the deployed backend; inspect
  it before running.
- `npm run test:ai` — contacts AI providers when keys are configured.
- `npm run seed` and `npm run load-test` write traffic/data; run only with
  explicit intent and a verified target.

Use `docker-compose.yml` for local PostgreSQL, Redis, and backend services.
The Docker image builds with `npm ci`, then `npm run build`.

## Definition of done

A backend change is done when its route/controller/model/service/job impact is
understood, its data and event contracts remain compatible, secrets stay out of
source and logs, relevant checks pass, and docs are updated for changed public
API, schema, environment, queue, or Socket.IO behavior.
