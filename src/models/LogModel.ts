import { PoolClient } from 'pg';
import { pool } from '../config/database';

export interface ApiLog {
    event_id: string;
    service_name: string;
    endpoint: string;
    method: string;
    status_code: number;
    response_time: number;
}

export class LogModel {
    static async createIfAbsent(log: ApiLog, client: PoolClient) {
        const result = await client.query(`INSERT INTO api_logs (event_id, service_name, endpoint, method, status_code, response_time)
            VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (event_id) WHERE event_id IS NOT NULL DO NOTHING RETURNING *`,
            [log.event_id, log.service_name, log.endpoint, log.method, log.status_code, log.response_time]);
        return result.rows[0] || null;
    }

    static async findByEventId(eventId: string) {
        const result = await pool.query('SELECT * FROM api_logs WHERE event_id = $1', [eventId]);
        return result.rows[0] || null;
    }
}
