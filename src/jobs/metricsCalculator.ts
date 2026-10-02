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
            const [current, baseline] = await Promise.all([MetricsModel.getAnomalyMetrics(), MetricsModel.getHistoricalBaseline()]);
            const analysis = baseline.ready ? await AIService.detectAnomalies(current, baseline) : {
                hasAnomaly: false, anomalyType: 'collecting_baseline', severity: 'low',
                explanation: 'Collecting the first 10 real telemetry events for a baseline.', recommendation: 'Run the demo scenario once.'
            };
            await redis.setex('ai:anomaly-detection', 300, JSON.stringify(analysis));
            return analysis;
        }
        case 'analyze-dashboard': {
            const latestEventId = await MetricsModel.getLatestEventId();
            const [lastAnalyzedEventId, cachedSummary, cachedErrors] = await Promise.all([
                redis.get('ai:dashboard:last-analyzed-event-id'), redis.get('ai:summary:1 hour'), redis.get('ai:error-analysis')
            ]);
            if (!latestEventId || (latestEventId === lastAnalyzedEventId && cachedSummary && cachedErrors)) {
                return { skipped: true };
            }
            const [statsByRange, errors] = await Promise.all([
                Promise.all(ranges.map(async range => [range, await MetricsModel.getEndpointStats(range)] as const)),
                MetricsModel.getRecentErrors('24 hours')
            ]);
            const analysis = await AIService.analyzeDashboard(Object.fromEntries(statsByRange), errors);
            await Promise.all([
                ...ranges.map(range => redis.setex(`ai:summary:${range}`, 300, JSON.stringify(analysis.summaries[range]))),
                redis.setex('ai:error-analysis', 300, JSON.stringify(analysis.errorAnalysis)),
                redis.set('ai:dashboard:last-analyzed-event-id', latestEventId)
            ]);
            return { analyzed: true, ranges };
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
