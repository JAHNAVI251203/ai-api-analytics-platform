import { Request, Response } from 'express';
import { redis } from '../config/database';

export class AIController {
    static async analyzeErrors(_req: Request, res: Response) {
        try {
            const cached = await redis.get('ai:error-analysis');
            return res.json(cached
                ? { success: true, data: JSON.parse(cached), cached: true }
                : { success: true, data: { message: 'AI analysis will appear once the latest telemetry has been processed.' }, pending: true });
        } catch {
            return res.json({ success: true, data: { message: 'AI analysis is temporarily unavailable.' }, fallback: true });
        }
    }

    static async detectAnomalies(_req: Request, res: Response) {
        try {
            const cached = await redis.get('ai:anomaly-detection');
            return res.json(cached
                ? { success: true, data: JSON.parse(cached), cached: true }
                : { success: true, data: { hasAnomaly: false, anomalyType: 'collecting_baseline', severity: 'low', explanation: 'Collecting the first 10 real telemetry events for a baseline.', recommendation: 'Run the demo scenario once.' }, pending: true });
        } catch {
            return res.json({ success: true, data: { hasAnomaly: false, anomalyType: 'none', severity: 'low', explanation: 'Anomaly analysis is temporarily unavailable.', recommendation: 'Review current metrics.' }, fallback: true });
        }
    }
}
