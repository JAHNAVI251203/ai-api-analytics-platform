import { metricsQueue } from './metricsCalculator';

export async function setupScheduledJobs() {
    const repeatableJobs = await metricsQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
        if (job.name === 'generate-demo-data') {
            await metricsQueue.removeRepeatableByKey(job.key);
        }
    }

    const scheduledOptions = (pattern: string, jobId: string) => ({
        jobId,
        attempts: 5,
        backoff: { type: 'exponential' as const, delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 100,
        repeat: { pattern }
    });

    //calculating metrics every 5 minutes
    await metricsQueue.add(
        'calculate-hourly-metrics',
        {},
        scheduledOptions('*/5 * * * *', 'calculate-hourly-metrics')
    );

    //detecting anomalies every 10 minutes
    await metricsQueue.add(
        'detect-anomalies',
        {},
        scheduledOptions('*/10 * * * *', 'detect-anomalies')
    );

    await metricsQueue.add(
        'analyze-errors',
        {},
        scheduledOptions('*/30 * * * *', 'analyze-errors')
    );

    await metricsQueue.add(
        'summarize-dashboard',
        {},
        scheduledOptions('*/30 * * * *', 'summarize-dashboard')
    );

    //cleaning up old logs at 2 AM everday
    await metricsQueue.add(
        'cleanup-old-logs',
        {},
        scheduledOptions('0 2 * * *', 'cleanup-old-logs')
    );

    //checking alerts every 2 mins
    await metricsQueue.add(
        'check-alerts',
        {},
        scheduledOptions('*/2 * * * *', 'check-alerts')
    );

    console.log('Scheduled jobs setup complete!!!');
}
