# Architecture

```text
Browser -> Dashboard action -> Demo scenario runner -> BullMQ -> worker -> PostgreSQL
                                                                  -> Redis invalidation + pub/sub
                                                                  -> Socket.IO -> dashboard
```

The request path ends after the ingestion service queues the event. The worker owns durable writes and retries. `api_logs.event_id` is unique, so a retried BullMQ job cannot duplicate a log; error-group updates share the same PostgreSQL transaction.

Redis holds short-lived dashboard/metrics cache entries and transports published telemetry from the worker to the API process. The worker also owns scheduled analytics, alert evaluation, and AI jobs. AI output is cached for dashboard reads and has a provider timeout/fallback.

The dashboard action runs a controlled 20-event scenario in the API process. It queues the same telemetry shape as normal ingestion, so the worker still owns durable writes, error grouping, cache invalidation, and realtime publication; no sample rows are inserted directly. A delayed BullMQ job then refreshes cached dashboard/error AI output, while anomaly detection compares the current traffic with its first 10 stored events.
