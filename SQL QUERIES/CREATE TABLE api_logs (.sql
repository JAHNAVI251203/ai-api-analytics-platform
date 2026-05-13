CREATE TABLE api_logs (
  id SERIAL PRIMARY KEY,
  endpoint VARCHAR(255),
  method VARCHAR(10),
  status_code INTEGER,
  response_time INTEGER,
  timestamp TIMESTAMP DEFAULT NOW(),
  request_body JSONB,
  response_body JSONB,
  user_agent TEXT,
  ip_address VARCHAR(45)
);

CREATE INDEX idx_timestamp ON api_logs(timestamp);
CREATE INDEX idx_endpoint ON api_logs(endpoint);