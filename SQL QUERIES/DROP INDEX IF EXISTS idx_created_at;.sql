DROP INDEX IF EXISTS idx_created_at;
DROP INDEX IF EXISTS idx_timestamp;

CREATE INDEX idx_timestamp ON api_logs(timestamp);