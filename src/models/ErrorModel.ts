import crypto from 'crypto';
import { PoolClient } from 'pg';
import { pool } from '../config/database';

export class ErrorModel {
    static async trackError(endpoint: string, method: string, statusCode: number, client: PoolClient) {
        const hash = crypto.createHash('sha256').update(`${endpoint}-${method}-${statusCode}`).digest('hex');
        const result = await client.query(`INSERT INTO error_groups (error_hash, error_message, endpoint, method, occurrence_count, last_seen)
            VALUES ($1, $2, $3, $4, 1, NOW()) ON CONFLICT (error_hash) DO UPDATE
            SET occurrence_count = error_groups.occurrence_count + 1, last_seen = NOW() RETURNING *`,
            [hash, `HTTP ${statusCode}`, endpoint, method]);
        return { ...result.rows[0], status_code: statusCode };
    }

    static async getTopErrors(limit: number = 10) {
        const result = await pool.query(`SELECT * FROM error_groups WHERE last_seen >= NOW() - INTERVAL '24 hours'
            ORDER BY occurrence_count DESC LIMIT $1`, [limit]);
        return result.rows;
    }
}
