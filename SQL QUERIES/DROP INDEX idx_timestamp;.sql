DROP INDEX idx_timestamp;

CREATE INDEX idx_created_at ON api_logs(created_at);