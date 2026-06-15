import { pool } from '../config/database';

export class MetricsModel {
    static async getOverallStats(timeRange: string = '1 hour') {
        const query = `
            SELECT 
                COUNT(*) as total_requests,
                AVG(response_time) as avg_response_time,
                MAX(response_time) as max_response_time,
                MIN(response_time) as min_response_time,
                COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count,
                COUNT(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 END) as success_count
            FROM api_logs
            WHERE timestamp >= NOW() - INTERVAL '${timeRange}'
        `;
        const result = await pool.query(query);
        return result.rows[0];
    }

    static async getEndpointStats(timeRange: string = '1 hour') {
        const query = `
            SELECT 
                endpoint,
                method,
                COUNT(*) as request_count,
                AVG(response_time) as avg_response_time,
                COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count
            FROM api_logs
            WHERE timestamp >= NOW() - INTERVAL '${timeRange}'
            GROUP BY endpoint, method
            ORDER BY request_count DESC
            LIMIT 10
        `;
        const result = await pool.query(query);
        return result.rows;
    }

    static async getStatusCodeDistribution(timeRange: string = '1 hour') {
        const query = `
            SELECT 
                status_code,
                COUNT(*) as count
            FROM api_logs
            WHERE timestamp >= NOW() - INTERVAL '${timeRange}'
            GROUP BY status_code
            ORDER BY status_code
        `;

        const result = await pool.query(query);
        return result.rows;
    }

    static async getRecentErrors(timeRange: string = '24 hours') {
        const query = `
            SELECT
                endpoint,
                method,
                status_code,
                response_time,
                timestamp
            FROM api_logs
            WHERE status_code >= 400
            AND timestamp >= NOW() - INTERVAL '${timeRange}'
            ORDER BY timestamp DESC
            LIMIT 100
        `;

        const result = await pool.query(query);
        return result.rows;
    }

    static async getAnomalyMetrics(timeRange: string = '1 hour') {
        const stats = await this.getOverallStats(timeRange);

        const endpointStats = await this.getEndpointStats(timeRange);

        return {
            ...stats,
            slowest_endpoint:
                endpointStats.length > 0
                    ? endpointStats.reduce((prev, curr) =>
                        Number(curr.avg_response_time) > Number(prev.avg_response_time) ? curr : prev
                    ).endpoint
                    : '/unknown'
        };
    }

    static async searchEndpoints(search: string, timeRange: string = '7 days', statusFilter: string = 'all') {
        let statusCondition = '';

        if (statusFilter === '2xx') {
            statusCondition =
                'AND status_code >= 200 AND status_code < 300';
        }

        if (statusFilter === '4xx') {
            statusCondition =
                'AND status_code >= 400 AND status_code < 500';
        }

        if (statusFilter === '5xx') {
            statusCondition =
                'AND status_code >= 500 AND status_code < 600';
        }

        const query = `
        SELECT
            endpoint,
            method,
            COUNT(*) as request_count,
            AVG(response_time) as avg_response_time,
            COUNT(
                CASE WHEN status_code >= 400 THEN 1 END
            ) as error_count
        FROM api_logs
        WHERE endpoint ILIKE $1
        AND timestamp >= NOW() - INTERVAL '${timeRange}'
        ${statusCondition}
        GROUP BY endpoint, method
        ORDER BY request_count DESC
    `;

        const result = await pool.query(
            query,
            [`%${search}%`]
        );

        return result.rows;
    }
}
