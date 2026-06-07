import { Request, Response } from 'express';
import { MetricsModel } from '../models/MetricsModel';
import { ErrorModel } from '../models/ErrorModel';
import { AIService } from '../services/AIService';
import { pool, redis } from '../config/database';
import { metricsQueue } from '../jobs/metricsCalculator';


export class DashboardController {
    static async getDashboard(req: Request, res: Response) {
        try {
            const timeRange = req.query.timeRange as string || '1 hour';
            const cacheKey = `dashboard:${timeRange}`;

            const cached = await redis.get(cacheKey);
            if (cached) {
                return res.json({
                    success: true,
                    data: JSON.parse(cached),
                    cached: true
                });
            }

            //fetching all dashboard data in parallel
            const [
                overallStats,
                endpointStats,
                statusDistribution,
                topErrors,
                timeSeriesData
            ] = await Promise.all([
                MetricsModel.getOverallStats(timeRange),
                MetricsModel.getEndpointStats(timeRange),
                MetricsModel.getStatusCodeDistribution(timeRange),
                ErrorModel.getTopErrors(10),
                DashboardController.getTimeSeriesData(timeRange)
            ]);

            //calculating derived metrics
            const errorRate = overallStats.total_requests > 0
                ? (overallStats.error_count / overallStats.total_requests * 100).toFixed(2)
                : 0;

            const successRate = overallStats.total_requests > 0
                ? (overallStats.success_count / overallStats.total_requests * 100).toFixed(2)
                : 0;

            let aiSummary = null;
            const aiCacheKey = `ai:summary:${timeRange}`;
            const cachedAI = await redis.get(aiCacheKey);

            if (cachedAI) {
                aiSummary = JSON.parse(cachedAI);
            } else {
                try {
                    aiSummary = await AIService.summarizeLogs(endpointStats);
                    await redis.setex(aiCacheKey, 600, JSON.stringify(aiSummary));//600 secs = 10 mins
                } catch (error) {
                    console.error('AI summary failed:', error);
                }
            }

            const dashboard = {
                overview: {
                    totalRequests: overallStats.total_requests,
                    avgResponseTime: Math.round(overallStats.avg_response_time),
                    maxResponseTime: overallStats.max_response_time,
                    minResponseTime: overallStats.min_response_time,
                    errorCount: overallStats.error_count,
                    successCount: overallStats.success_count,
                    errorRate: errorRate,
                    successRate: successRate
                },
                endpoints: endpointStats,
                statusCodes: statusDistribution,
                topErrors: topErrors,
                timeSeries: timeSeriesData,
                aiSummary: aiSummary,
                timestamp: new Date()
            };

            await redis.setex(cacheKey, 60, JSON.stringify(dashboard));

            res.json({
                success: true,
                data: dashboard,
                cached: false
            });

        } catch (error) {
            console.error('Dashboard error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch dashboard data'
            });
        }
    }

    private static async getTimeSeriesData(timeRange: string) {
        //data points for charts
        const query = `
            SELECT 
                date_trunc('minute', timestamp) as time_bucket,
                COUNT(*) as request_count,
                AVG(response_time) as avg_response_time,
                COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count
            FROM api_logs
            WHERE timestamp >= NOW() - INTERVAL '${timeRange}'
            GROUP BY time_bucket
            ORDER BY time_bucket ASC
        `;

        const result = await pool.query(query);
        return result.rows;
    }

    static async getEndpointDetails(req: Request, res: Response) {
        try {
            const { endpoint } = req.params;
            const timeRange = req.query.timeRange as string || '1 hour';

            const query = `
                SELECT 
                    method,
                    COUNT(*) as total_requests,
                    AVG(response_time) as avg_response_time,
                    MIN(response_time) as min_response_time,
                    MAX(response_time) as max_response_time,
                    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time) as p95_response_time,
                    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time) as p99_response_time,
                    COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count
                FROM api_logs
                WHERE endpoint = $1 
                AND timestamp >= NOW() - INTERVAL '${timeRange}'
                GROUP BY method
            `;

            const result = await pool.query(query, [endpoint]);

            res.json({
                success: true,
                data: {
                    endpoint,
                    stats: result.rows
                }
            });

        } catch (error) {
            console.error('Endpoint details error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch endpoint details'
            });
        }
    }

    static async getSystemHealth(req: Request, res: Response) {
        try {
            const dbCheck = await pool.query('SELECT NOW()');

            await redis.ping();

            const queueHealth = await metricsQueue.getJobCounts();

            res.json({
                success: true,
                data: {
                    status: 'healthy',
                    timestamp: new Date(),
                    services: {
                        database: 'up',
                        redis: 'up',
                        queue: 'up'
                    },
                    queue: queueHealth
                }
            });
        } catch (error) {
            res.status(503).json({
                success: false,
                error: 'System unhealthy'
            });
        }
    }
}