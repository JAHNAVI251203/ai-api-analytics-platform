import { Queue, Worker } from 'bullmq';
import { pool, redis } from '../config/database';
import { MetricsModel } from '../models/MetricsModel';
import { AIService } from '../services/AIService';
import { AlertService } from '../services/AlertService';

export const metricsQueue = new Queue('metrics-calculation', {
    connection: redis
});

export const metricsWorker = new Worker('metrics-calculation',
    async (job) => {
        console.log(`Processing job ${job.id}: ${job.name}`);

        switch (job.name) {
            case 'calculate-hourly-metrics':
                const metrics = await MetricsModel.getOverallStats('1 hour');
                console.log('Hourly metrics calculated:', metrics);

                await redis.setex('metrics:hourly', 3600, JSON.stringify(metrics));//3600 sec = 60 mins(1 hour)

                return metrics;

            case 'detect-anomalies':
                const currentMetrics = await MetricsModel.getOverallStats('1 hour');
                const anomalies = await AIService.detectAnomalies(currentMetrics);

                if (anomalies.hasAnomaly) {
                    console.log('Anomaly detected:', anomalies);
                }
                
                return anomalies;

            case 'cleanup-old-logs':
                await pool.query('DELETE FROM api_logs WHERE timestamp < NOW() - INTERVAL \'30 days\'');
                console.log('Old logs cleaned up');
                return { cleaned: true };

            case "check-alerts":
                await AlertService.checkAlerts();
                break;

            default:
                throw new Error(`Unknown job: ${job.name}`);
        }
    },
    {
        connection: redis,
        concurrency: 5
    }
);

metricsWorker.on('completed', (job) => {
    console.log(`Job ${job.id} completed`);
});

metricsWorker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err);
});