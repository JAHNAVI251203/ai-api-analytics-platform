import { pool } from '../config/database';

export interface ApiLog {
    endpoint: string;
    method: string;
    status_code: number;
    response_time: number;
    request_body?: object;
    response_body?: object;
    user_agent?: string;
    ip_address?: string;
}

export class LogModel {
    static async create(log: ApiLog) {
        const query = `
            INSERT INTO api_logs 
            (endpoint, method, status_code, response_time, request_body, response_body, user_agent, ip_address)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;
        
        const values = [
            log.endpoint,
            log.method,
            log.status_code,
            log.response_time,
            JSON.stringify(log.request_body || {}), 
            JSON.stringify(log.response_body || {}),
            log.user_agent,
            log.ip_address
        ];
        
        const result = await pool.query(query, values);
        return result.rows[0];
    }
}