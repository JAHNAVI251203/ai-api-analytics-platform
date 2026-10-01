# Database schema

`api_logs` is the telemetry source of truth: `event_id` (unique UUID), `service_name`, `endpoint`, `method`, `status_code`, `response_time`, and `timestamp`. It is indexed by timestamp and endpoint.

`error_groups` groups failed responses by a SHA-256 hash of endpoint, method, and status code, and records first/last seen plus occurrence count. `alert_rules` stores administrator-managed threshold rules; `alert_history` records delivery attempts.

The schema intentionally stores telemetry metadata only. Request/response bodies, client IP addresses, user-agent strings, data-source flags, and sample keys are not part of the final model.
