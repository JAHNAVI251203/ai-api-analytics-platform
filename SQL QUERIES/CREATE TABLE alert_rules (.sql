CREATE TABLE alert_rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    condition_type VARCHAR(50), -- 'error_rate', 'latency', 'traffic_spike'
    threshold FLOAT,
    time_window VARCHAR(20),
    webhook_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE alert_history (
    id SERIAL PRIMARY KEY,
    rule_id INTEGER REFERENCES alert_rules(id),
    triggered_at TIMESTAMP DEFAULT NOW(),
    alert_data JSONB,
    webhook_response JSONB
);