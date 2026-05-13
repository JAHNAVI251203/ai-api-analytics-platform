CREATE TABLE error_groups (
    id SERIAL PRIMARY KEY,
    error_hash VARCHAR(64) UNIQUE,
    error_message TEXT,
    endpoint VARCHAR(255),
    method VARCHAR(10),
    first_seen TIMESTAMP DEFAULT NOW(),
    last_seen TIMESTAMP DEFAULT NOW(),
    occurrence_count INTEGER DEFAULT 1
);