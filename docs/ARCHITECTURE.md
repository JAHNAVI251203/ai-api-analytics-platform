# Architecture

```text
Browser -> Dashboard action -> Demo API scenario -> POST /logs (API key) -> BullMQ
                                                                         -> worker -> PostgreSQL
                                                                                   -> Redis invalidation + pub/sub
                                                                                   -> Socket.IO -> dashboard
```

The request path ends after the ingestion service queues the event. The worker owns durable writes and retries. `api_logs.event_id` is unique, so a retried BullMQ job cannot duplicate a log; error-group updates share the same PostgreSQL transaction.

Redis holds short-lived dashboard/metrics cache entries and transports published telemetry from the worker to the API process. The worker also owns scheduled analytics, alert evaluation, and AI jobs. AI output is cached for dashboard reads and has a provider timeout/fallback.

The dashboard action calls the Demo API once and waits for its 20 controlled HTTP requests. Those requests use real endpoint responses and measured durations; no sample rows or direct database inserts exist. A delayed BullMQ job then refreshes cached dashboard/error AI output, while anomaly detection compares the current traffic with its first 10 stored events.
