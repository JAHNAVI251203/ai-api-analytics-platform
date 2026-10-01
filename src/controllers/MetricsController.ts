import { Request, Response } from 'express';
import { MetricsModel, normalizeTimeRange } from '../models/MetricsModel';
import { ErrorModel } from '../models/ErrorModel';
import { redis } from '../config/database';

export class MetricsController {
    static async getMetrics(req: Request, res: Response) {
        try {
            const timeRange = normalizeTimeRange(req.query.timeRange as string);
            const key = `metrics:${timeRange}`;
            const cached = await redis.get(key);
            if (cached) return res.json({ success: true, data: JSON.parse(cached), cached: true });
            const [overall, endpoints, statusCodes] = await Promise.all([
                MetricsModel.getOverallStats(timeRange), MetricsModel.getEndpointStats(timeRange), MetricsModel.getStatusCodeDistribution(timeRange)
            ]);
            const data = { overall, endpoints, statusCodes };
            await redis.setex(key, 60, JSON.stringify(data));
            res.json({ success: true, data, cached: false });
        } catch { res.status(500).json({ success: false, error: 'Failed to fetch metrics' }); }
    }

    static async getErrors(req: Request, res: Response) {
        try {
            const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
            res.json({ success: true, data: await ErrorModel.getTopErrors(limit) });
        } catch { res.status(500).json({ success: false, error: 'Failed to fetch errors' }); }
    }
}
