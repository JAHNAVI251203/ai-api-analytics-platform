import { Request, Response } from 'express';
import { MetricsModel, normalizeTimeRange } from '../models/MetricsModel';
import { ErrorModel } from '../models/ErrorModel';
import { pool, redis } from '../config/database';

export class DashboardController {
    static async getDashboard(req: Request, res: Response) {
        try {
            const timeRange = normalizeTimeRange(req.query.timeRange as string);
            const cacheKey = `dashboard:${timeRange}`;
            const cached = await redis.get(cacheKey);
            if (cached) return res.json({ success: true, data: JSON.parse(cached), cached: true });
            const [overallStats, endpoints, statusCodes, topErrors, timeSeries] = await Promise.all([
                MetricsModel.getOverallStats(timeRange), MetricsModel.getEndpointStats(timeRange), MetricsModel.getStatusCodeDistribution(timeRange),
                ErrorModel.getTopErrors(), DashboardController.getTimeSeriesData(timeRange)
            ]);
            const total = Number(overallStats.total_requests);
            const dashboard = {
                overview: {
                    totalRequests: overallStats.total_requests, avgResponseTime: Math.round(Number(overallStats.avg_response_time) || 0),
                    maxResponseTime: overallStats.max_response_time, minResponseTime: overallStats.min_response_time,
                    errorCount: overallStats.error_count, successCount: overallStats.success_count,
                    errorRate: total ? ((Number(overallStats.error_count) / total) * 100).toFixed(2) : 0,
                    successRate: total ? ((Number(overallStats.success_count) / total) * 100).toFixed(2) : 0
                }, endpoints, statusCodes, topErrors, timeSeries,
                aiSummary: JSON.parse((await redis.get(`ai:summary:${timeRange}`)) || '"AI summary is being prepared in the background."'), timestamp: new Date()
            };
            await redis.setex(cacheKey, 60, JSON.stringify(dashboard));
            res.json({ success: true, data: dashboard, cached: false });
        } catch (error) {
            console.error('Dashboard error:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch dashboard data' });
        }
    }

    private static async getTimeSeriesData(timeRange: string) {
        const result = await pool.query(`SELECT date_trunc('minute', timestamp) AS time_bucket, COUNT(*) AS request_count,
            AVG(response_time) AS avg_response_time, COUNT(*) FILTER (WHERE status_code >= 400) AS error_count
            FROM api_logs WHERE timestamp >= NOW() - $1::interval GROUP BY time_bucket ORDER BY time_bucket`, [normalizeTimeRange(timeRange)]);
        return result.rows;
    }

    static async getEndpointDetails(req: Request, res: Response) {
        try {
            const result = await pool.query(`SELECT method, COUNT(*) AS total_requests, AVG(response_time) AS avg_response_time,
                MIN(response_time) AS min_response_time, MAX(response_time) AS max_response_time,
                PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time) AS p95_response_time,
                PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time) AS p99_response_time,
                COUNT(*) FILTER (WHERE status_code >= 400) AS error_count FROM api_logs
                WHERE endpoint = $1 AND timestamp >= NOW() - $2::interval GROUP BY method`,
                [req.params.endpoint, normalizeTimeRange(req.query.timeRange as string)]);
            res.json({ success: true, data: { endpoint: req.params.endpoint, stats: result.rows } });
        } catch { res.status(500).json({ success: false, error: 'Failed to fetch endpoint details' }); }
    }

    static async searchEndpoints(req: Request, res: Response) {
        try {
            const endpoints = await MetricsModel.searchEndpoints(String(req.query.search || ''),
                normalizeTimeRange(req.query.timeRange as string, '7 days'), String(req.query.statusFilter || 'all'));
            res.json({ success: true, data: endpoints });
        } catch { res.status(500).json({ success: false, error: 'Failed to search endpoints' }); }
    }
}
