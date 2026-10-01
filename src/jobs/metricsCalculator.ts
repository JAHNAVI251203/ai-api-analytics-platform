import { Queue, Worker } from 'bullmq';
import { pool, redis } from '../config/database';
import { MetricsModel, type TimeRange } from '../models/MetricsModel';
import { AIService } from '../services/AIService';
import { AlertService } from '../services/AlertService';

export const metricsQueue = new Queue('metrics-calculation', { connection: redis });
const ranges: TimeRange[] = ['1 hour', '6 hours', '24 hours', '7 days'];

export const metricsWorker = process.env.APP_ROLE === 'worker' ? new Worker('metrics-calculation', async (job) => {
    switch (job.name) {
        case 'calculate-hourly-metrics': {
            const metrics = await MetricsModel.getOverallStats('1 hour');
            await redis.setex('metrics:hourly', 3600, JSON.stringify(metrics));
            return metrics;
        }
        case 'detect-anomalies': {
            const [current, baseline] = await Promise.all([MetricsModel.getAnomalyMetrics('1 hour'), MetricsModel.getHistoricalBaseline()]);
            const analysis = baseline.ready ? await AIService.detectAnomalies(current, baseline) : {
                hasAnomaly: false, anomalyType: 'collecting_baseline', severity: 'low',
                explanation: 'Collecting seven days of real telemetry for a baseline.', recommendation: 'Keep sending real API requests.'
            };
            await redis.setex('ai:anomaly-detection', 600, JSON.stringify(analysis));
            return analysis;
        }
        case 'analyze-errors': {
            const errors = await MetricsModel.getRecentErrors('24 hours');
            const analysis = errors.length ? await AIService.analyzeErrors(errors) : { message: 'No errors to analyze' };
            await redis.setex('ai:error-analysis', 1800, JSON.stringify(analysis));
            return analysis;
        }
        case 'summarize-dashboard': {
            for (const range of ranges) {
                const summary = await AIService.summarizeLogs(await MetricsModel.getEndpointStats(range));
                await redis.setex(`ai:summary:${range}`, 1800, JSON.stringify(summary));
            }
            return { ranges };
        }
        case 'cleanup-old-logs':
            await pool.query("DELETE FROM api_logs WHERE timestamp < NOW() - INTERVAL '30 days'");
            return { cleaned: true };
        case 'check-alerts':
            await AlertService.checkAlerts();
            return { checked: true };
        default: throw new Error(`Unknown job: ${job.name}`);
    }
}, { connection: redis, concurrency: 5 }) : undefined;

metricsWorker?.on('failed', (job, error) => console.error(`Metrics job ${job?.id} failed:`, error));
