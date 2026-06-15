import pool from "../config/database";

export async function runMigrations() {
    try {
        console.log("Running database migrations...");

        await pool.query(`
            CREATE TABLE IF NOT EXISTS api_logs (
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
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS error_groups (
                id SERIAL PRIMARY KEY,
                error_hash VARCHAR(64) UNIQUE,
                error_message TEXT,
                endpoint VARCHAR(255),
                method VARCHAR(10),
                first_seen TIMESTAMP DEFAULT NOW(),
                last_seen TIMESTAMP DEFAULT NOW(),
                occurrence_count INTEGER DEFAULT 1
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS alert_rules (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255),
                condition_type VARCHAR(50),
                threshold FLOAT,
                time_window VARCHAR(20),
                webhook_url TEXT,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS alert_history (
                id SERIAL PRIMARY KEY,
                rule_id INTEGER REFERENCES alert_rules(id),
                triggered_at TIMESTAMP DEFAULT NOW(),
                alert_data JSONB,
                webhook_response JSONB
            );
        `);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_timestamp
            ON api_logs(timestamp);
        `);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_endpoint
            ON api_logs(endpoint);
        `);

        console.log("Database migrations completed");
    } catch (error) {
        console.error("Migration failed:", error);
    }
}