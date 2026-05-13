import { Request, Response } from 'express';
import { MetricsModel } from '../models/MetricsModel';
import { redis } from '../config/database';
import { ErrorModel } from '../models/ErrorModel';

export class MetricsController {
    static async getMetrics(req: Request, res: Response) {
        try {
            const timeRange = req.query.timeRange as string || '1 hour';
            const cacheKey = `metrics:${timeRange}`;//checking cached data first
            const cached = await redis.get(cacheKey);

            if (cached) {
                return res.json({ success: true, data: JSON.parse(cached), cached: true });
            }

            //calculating metrics
            const [overallStats, endpointStats, statusDistribution] = await Promise.all([
                MetricsModel.getOverallStats(timeRange),
                MetricsModel.getEndpointStats(timeRange),
                MetricsModel.getStatusCodeDistribution(timeRange)
            ]);

            const metrics = {
                overall: overallStats,
                endpoints: endpointStats,
                statusCodes: statusDistribution,
                timestamp: new Date()
            };

            //cache for 30 seconds
            await redis.setex(cacheKey, 30, JSON.stringify(metrics));

            res.json({
                success: true,
                data: metrics,
                cached: false
            });
        } catch (error) {
            console.error('Error fetching metrics:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch metrics'
            });
        }
    }

    static async getTopErrors(req: Request, res: Response) {
        try {
            const limit = parseInt(req.query.limit as string) || 10;
            const errors = await ErrorModel.getTopErrors(limit);
            res.json({ success: true, data: errors });
        } catch (error) {
            console.error('Error fetching top errors:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch errors' });
        }
    }
}