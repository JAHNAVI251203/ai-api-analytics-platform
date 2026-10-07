import { pool } from '../config/database';

export type TimeRange = '1 hour' | '6 hours' | '24 hours' | '7 days';
export const isTimeRange = (value: unknown): value is TimeRange =>
    value === '1 hour' || value === '6 hours' || value === '24 hours' || value === '7 days';
export const normalizeTimeRange = (value?: string, fallback: TimeRange = '1 hour'): TimeRange =>
    isTimeRange(value) ? value : fallback;

export class MetricsModel {
    static async getOverallStats(timeRange: string = '1 hour') {
        const result = await pool.query(`SELECT COUNT(*) AS total_requests, AVG(response_time) AS avg_response_time,
            MAX(response_time) AS max_response_time, MIN(response_time) AS min_response_time,
            COUNT(*) FILTER (WHERE status_code >= 400) AS error_count,
            COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 300) AS success_count
            FROM api_logs WHERE timestamp >= NOW() - $1::interval`, [normalizeTimeRange(timeRange)]);
        return result.rows[0];
    }

    static async getEndpointStats(timeRange: string = '1 hour') {
        const result = await pool.query(`SELECT endpoint, method, COUNT(*) AS request_count, AVG(response_time) AS avg_response_time,
            COUNT(*) FILTER (WHERE status_code >= 400) AS error_count FROM api_logs
            WHERE timestamp >= NOW() - $1::interval GROUP BY endpoint, method ORDER BY request_count DESC LIMIT 10`, [normalizeTimeRange(timeRange)]);
        return result.rows;
    }

    static async getStatusCodeDistribution(timeRange: string = '1 hour') {
        const result = await pool.query(`SELECT status_code, COUNT(*) AS count FROM api_logs
            WHERE timestamp >= NOW() - $1::interval GROUP BY status_code ORDER BY status_code`, [normalizeTimeRange(timeRange)]);
        return result.rows;
    }

    static async getRecentErrors(timeRange: string = '24 hours') {
        const result = await pool.query(`SELECT endpoint, method, status_code, response_time, timestamp FROM api_logs
            WHERE status_code >= 400 AND timestamp >= NOW() - $1::interval ORDER BY timestamp DESC LIMIT 100`, [normalizeTimeRange(timeRange, '24 hours')]);
        return result.rows;
    }

    static async getAnomalyMetrics() {
        const [statsResult, endpointsResult] = await Promise.all([
            pool.query(`WITH recent AS (SELECT * FROM api_logs ORDER BY timestamp DESC, id DESC LIMIT 10)
                SELECT COUNT(*) AS total_requests, AVG(response_time) AS avg_response_time,
                COUNT(*) FILTER (WHERE status_code >= 400) AS error_count FROM recent`),
            pool.query(`WITH recent AS (SELECT * FROM api_logs ORDER BY timestamp DESC, id DESC LIMIT 10)
                SELECT endpoint, AVG(response_time) AS avg_response_time FROM recent GROUP BY endpoint`)
        ]);
        const stats = statsResult.rows[0] || { total_requests: 0, avg_response_time: 0, error_count: 0 };
        const endpoints = endpointsResult.rows;
        const slowest = endpoints.reduce((current, endpoint) => Number(endpoint.avg_response_time) > Number(current.avg_response_time) ? endpoint : current,
            endpoints[0] || { endpoint: '/unknown', avg_response_time: 0 });
        return { ...stats, slowest_endpoint: slowest.endpoint };
    }

    static async getHistoricalBaseline() {
        const result = await pool.query(`WITH baseline AS (SELECT * FROM api_logs ORDER BY timestamp ASC, id ASC LIMIT 10)
            SELECT COUNT(*) >= 10 AS ready, COUNT(*) AS total_requests, AVG(response_time) AS avg_response_time,
            COALESCE(100.0 * COUNT(*) FILTER (WHERE status_code >= 400) / NULLIF(COUNT(*), 0), 0) AS error_rate
            FROM baseline`);
        return result.rows[0];
    }

    static async getLatestEventId() {
        const result = await pool.query('SELECT event_id FROM api_logs ORDER BY timestamp DESC, id DESC LIMIT 1');
        return result.rows[0]?.event_id as string | undefined;
    }

}
