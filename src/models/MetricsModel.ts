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

    static async getAnomalyMetrics(timeRange: string = '1 hour') {
        const [stats, endpoints] = await Promise.all([this.getOverallStats(timeRange), this.getEndpointStats(timeRange)]);
        const slowest = endpoints.reduce((current, endpoint) => Number(endpoint.avg_response_time) > Number(current.avg_response_time) ? endpoint : current,
            endpoints[0] || { endpoint: '/unknown', avg_response_time: 0 });
        return { ...stats, slowest_endpoint: slowest.endpoint };
    }

    static async getHistoricalBaseline() {
        const result = await pool.query(`SELECT MIN(timestamp) <= NOW() - INTERVAL '7 days' AS ready,
            COUNT(*) AS total_requests, COUNT(*) / 167.0 AS requests_per_hour, AVG(response_time) AS avg_response_time,
            COALESCE(100.0 * COUNT(*) FILTER (WHERE status_code >= 400) / NULLIF(COUNT(*), 0), 0) AS error_rate
            FROM api_logs WHERE timestamp >= NOW() - INTERVAL '7 days' AND timestamp < NOW() - INTERVAL '1 hour'`);
        return result.rows[0];
    }

    static async searchEndpoints(search: string, timeRange: string = '7 days', statusFilter: string = 'all') {
        const condition = statusFilter === '2xx' ? 'AND status_code BETWEEN 200 AND 299'
            : statusFilter === '4xx' ? 'AND status_code BETWEEN 400 AND 499'
            : statusFilter === '5xx' ? 'AND status_code BETWEEN 500 AND 599' : '';
        const result = await pool.query(`SELECT endpoint, method, COUNT(*) AS request_count, AVG(response_time) AS avg_response_time,
            COUNT(*) FILTER (WHERE status_code >= 400) AS error_count FROM api_logs
            WHERE endpoint ILIKE $1 AND timestamp >= NOW() - $2::interval ${condition}
            GROUP BY endpoint, method ORDER BY request_count DESC`, [`%${search}%`, normalizeTimeRange(timeRange, '7 days')]);
        return result.rows;
    }
}
