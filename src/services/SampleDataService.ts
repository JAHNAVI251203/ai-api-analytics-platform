import { pool } from '../config/database';

const sampleEvents = [
    ['/api/users', 'GET', 200, 84, 5],
    ['/api/orders', 'GET', 200, 112, 12],
    ['/api/products', 'GET', 200, 76, 20],
    ['/api/auth/login', 'POST', 200, 148, 28],
    ['/api/orders', 'POST', 201, 194, 37],
    ['/api/payments', 'POST', 200, 231, 48],
    ['/api/users', 'GET', 200, 91, 64],
    ['/api/orders', 'GET', 500, 842, 96],
    ['/api/products', 'GET', 200, 81, 180],
    ['/api/comments', 'GET', 200, 105, 360],
    ['/api/orders', 'POST', 400, 128, 720],
    ['/api/users', 'GET', 200, 88, 1440],
    ['/api/payments', 'POST', 200, 220, 2880],
    ['/api/auth/login', 'POST', 401, 156, 4320],
    ['/api/products', 'GET', 200, 79, 5760],
    ['/api/orders', 'GET', 200, 118, 7200],
    ['/api/users', 'GET', 200, 93, 8640],
    ['/api/comments', 'GET', 404, 102, 10000],
] as const;

export async function ensureSampleData() {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        for (const [endpoint, method, statusCode, responseTime, minutesAgo] of sampleEvents) {
            await client.query(
                `
                    INSERT INTO api_logs
                        (endpoint, method, status_code, response_time, timestamp, user_agent, data_source, sample_key)
                    VALUES
                        ($1, $2, $3, $4, NOW() - ($5 * INTERVAL '1 minute'), $6, 'sample', $7)
                    ON CONFLICT (sample_key) WHERE sample_key IS NOT NULL
                    DO UPDATE SET timestamp = EXCLUDED.timestamp
                `,
                [
                    endpoint,
                    method,
                    statusCode,
                    responseTime,
                    minutesAgo,
                    'API Sentinel Sample Telemetry',
                    `portfolio-sample-${minutesAgo}`
                ]
            );

            if (statusCode >= 400) {
                await client.query(
                    `
                        INSERT INTO error_groups
                            (error_hash, error_message, endpoint, method, occurrence_count, last_seen, data_source, sample_key)
                        VALUES
                            ($1, $2, $3, $4, 1, NOW(), 'sample', $5)
                        ON CONFLICT (error_hash)
                        DO UPDATE SET last_seen = NOW()
                    `,
                    [
                        `portfolio-sample-${endpoint}-${statusCode}`,
                        `Sample HTTP ${statusCode} response`,
                        endpoint,
                        method,
                        `portfolio-sample-error-${minutesAgo}`
                    ]
                );
            }
        }

        await client.query('COMMIT');
        console.log(`Sample telemetry ready (${sampleEvents.length} rows)`);
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}
