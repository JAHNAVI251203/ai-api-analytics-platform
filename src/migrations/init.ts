import pool from '../config/database';

export async function runMigrations() {
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, email VARCHAR(255) UNIQUE NOT NULL, password_hash TEXT NOT NULL, is_active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMP DEFAULT NOW())`);
        await pool.query(`CREATE TABLE IF NOT EXISTS api_logs (id SERIAL PRIMARY KEY, event_id UUID UNIQUE NOT NULL, service_name VARCHAR(100) NOT NULL, endpoint VARCHAR(255) NOT NULL, method VARCHAR(10) NOT NULL, status_code INTEGER NOT NULL, response_time INTEGER NOT NULL, timestamp TIMESTAMP DEFAULT NOW())`);
        await pool.query(`CREATE TABLE IF NOT EXISTS error_groups (id SERIAL PRIMARY KEY, error_hash VARCHAR(64) UNIQUE, error_message TEXT, endpoint VARCHAR(255), method VARCHAR(10), first_seen TIMESTAMP DEFAULT NOW(), last_seen TIMESTAMP DEFAULT NOW(), occurrence_count INTEGER DEFAULT 1)`);
        await pool.query(`CREATE TABLE IF NOT EXISTS alert_rules (id SERIAL PRIMARY KEY, name VARCHAR(255), condition_type VARCHAR(50), threshold FLOAT, time_window VARCHAR(20), webhook_url TEXT, is_active BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT NOW())`);
        await pool.query(`CREATE TABLE IF NOT EXISTS alert_history (id SERIAL PRIMARY KEY, rule_id INTEGER REFERENCES alert_rules(id), triggered_at TIMESTAMP DEFAULT NOW(), alert_data JSONB, webhook_response JSONB)`);
        await pool.query('ALTER TABLE api_logs ADD COLUMN IF NOT EXISTS event_id UUID');
        await pool.query('ALTER TABLE api_logs ADD COLUMN IF NOT EXISTS service_name VARCHAR(100)');
        await pool.query('DROP INDEX IF EXISTS idx_api_logs_sample_key');
        await pool.query('DROP INDEX IF EXISTS idx_error_groups_sample_key');
        await pool.query('ALTER TABLE api_logs DROP COLUMN IF EXISTS request_body, DROP COLUMN IF EXISTS response_body, DROP COLUMN IF EXISTS user_agent, DROP COLUMN IF EXISTS ip_address, DROP COLUMN IF EXISTS data_source, DROP COLUMN IF EXISTS sample_key');
        await pool.query('ALTER TABLE error_groups DROP COLUMN IF EXISTS data_source, DROP COLUMN IF EXISTS sample_key');
        await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_api_logs_event_id ON api_logs(event_id) WHERE event_id IS NOT NULL');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_timestamp ON api_logs(timestamp)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_endpoint ON api_logs(endpoint)');
        console.log('Database migrations completed');
    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    }
}
