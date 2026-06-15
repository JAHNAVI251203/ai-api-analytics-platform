import { pool } from '../config/database';
import crypto from 'crypto';

export class ErrorModel {
    static generateErrorHash(endpoint: string, statusCode: number, errorMessage: string): string {
        return crypto
            .createHash('md5')
            .update(`${endpoint}-${statusCode}-${errorMessage}`)
            .digest('hex');
    }

    static async trackError(endpoint: string, method: string, statusCode: number, responseBody: any) {
        const errorMessage = responseBody?.error || responseBody?.message || 'Unknown error';
        const errorHash = this.generateErrorHash(endpoint, statusCode, errorMessage);

        const query = `
            INSERT INTO error_groups (error_hash, error_message, endpoint, method, occurrence_count, last_seen)
            VALUES ($1, $2, $3, $4, 1, NOW())
            ON CONFLICT (error_hash) 
            DO UPDATE SET 
                occurrence_count = error_groups.occurrence_count + 1,
                last_seen = NOW()
            RETURNING *
        `;

        const result = await pool.query(query, [errorHash, errorMessage, endpoint, method]);
        return {
            ...result.rows[0],
            status_code: statusCode
        };
    }

    static async getTopErrors(limit: number = 10) {
        const query = `
            SELECT * FROM error_groups
            WHERE last_seen >= NOW() - INTERVAL '24 hours'
            ORDER BY occurrence_count DESC
            LIMIT $1
        `;

        const result = await pool.query(query, [limit]);
        return result.rows;
    }
}