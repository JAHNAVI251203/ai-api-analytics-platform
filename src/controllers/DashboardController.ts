import { Request, Response } from 'express';
import { MetricsModel, normalizeTimeRange, TimeRange } from '../models/MetricsModel';
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
                aiSummary: JSON.parse((await redis.get(`ai:summary:${timeRange}`)) || '"Insights will appear once the latest telemetry has been processed."'), timestamp: new Date()
            };
            await redis.setex(cacheKey, 60, JSON.stringify(dashboard));
            res.json({ success: true, data: dashboard, cached: false });
        } catch (error) {
            console.error('Dashboard error:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch dashboard data' });
        }
    }

    private static async getTimeSeriesData(timeRange: TimeRange) {
        if (timeRange === '7 days') {
            const result = await pool.query(`WITH buckets AS (
                SELECT generate_series(
                    date_trunc('day', NOW()) - INTERVAL '6 days',
                    date_trunc('day', NOW()),
                    INTERVAL '1 day'
                ) AS time_bucket
            ), metrics AS (
                SELECT date_trunc('day', timestamp) AS time_bucket, COUNT(*) AS request_count,
                    AVG(response_time) AS avg_response_time, COUNT(*) FILTER (WHERE status_code >= 400) AS error_count
                FROM api_logs
                WHERE timestamp >= date_trunc('day', NOW()) - INTERVAL '6 days'
                GROUP BY time_bucket
            )
            SELECT buckets.time_bucket, COALESCE(metrics.request_count, 0) AS request_count,
                COALESCE(metrics.avg_response_time, 0) AS avg_response_time,
                COALESCE(metrics.error_count, 0) AS error_count
            FROM buckets LEFT JOIN metrics ON metrics.time_bucket = buckets.time_bucket
            ORDER BY buckets.time_bucket`);
            return result.rows;
        }

        const bucketSize = rollingBucketByRange[timeRange];
        const result = await pool.query(`WITH range_bounds AS (
            SELECT date_trunc('minute', NOW()) AS end_at, $1::interval AS range_length, $2::interval AS bucket_size
        ), buckets AS (
            SELECT series.bucket AS time_bucket,
                LEAD(series.bucket, 1, range_bounds.end_at) OVER (ORDER BY series.bucket) AS bucket_end
            FROM range_bounds
            CROSS JOIN LATERAL generate_series(
                range_bounds.end_at - range_bounds.range_length,
                range_bounds.end_at - range_bounds.bucket_size,
                range_bounds.bucket_size
            ) AS series(bucket)
        )
        SELECT buckets.time_bucket, COUNT(api_logs.id) AS request_count,
            COALESCE(AVG(api_logs.response_time), 0) AS avg_response_time,
            COUNT(api_logs.id) FILTER (WHERE api_logs.status_code >= 400) AS error_count
        FROM buckets
        LEFT JOIN api_logs ON api_logs.timestamp >= buckets.time_bucket AND api_logs.timestamp < buckets.bucket_end
        GROUP BY buckets.time_bucket
        ORDER BY buckets.time_bucket`, [timeRange, bucketSize]);
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

}

const rollingBucketByRange: Record<Exclude<TimeRange, '7 days'>, '5 minutes' | '30 minutes' | '1 hour'> = {
    '1 hour': '5 minutes',
    '6 hours': '30 minutes',
    '24 hours': '1 hour',
};
