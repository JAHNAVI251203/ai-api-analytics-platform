# Architecture

```text
Browser -> Demo API -> POST /logs (API key) -> BullMQ
                                             -> worker -> PostgreSQL
                                                       -> Redis invalidation + pub/sub
                                                       -> Socket.IO -> admin dashboard
```

The request path ends after the ingestion service queues the event. The worker owns durable writes and retries. `api_logs.event_id` is unique, so a retried BullMQ job cannot duplicate a log; error-group updates share the same PostgreSQL transaction.

Redis holds short-lived dashboard/metrics cache entries and transports published telemetry from the worker to the API process. The worker also owns scheduled analytics, alert evaluation, and AI jobs. AI output is cached for dashboard reads and has a provider timeout/fallback.

The only proof client is the manual Demo API. No sample rows, polling jobs, or synthetic load generators exist.
