import { metricsQueue } from './metricsCalculator';

export async function setupScheduledJobs() {
    const repeatableJobs = await metricsQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
        if (job.name === 'generate-demo-data') {
            await metricsQueue.removeRepeatableByKey(job.key);
        }
    }

    //calculating metrics every 5 minutes
    await metricsQueue.add(
        'calculate-hourly-metrics',
        {},
        { repeat: { pattern: '*/5 * * * *' } }
    );

    //detecting anomalies every 10 minutes
    await metricsQueue.add(
        'detect-anomalies',
        {},
        { repeat: { pattern: '*/10 * * * *' } }
    );

    //cleaning up old logs at 2 AM everday
    await metricsQueue.add(
        'cleanup-old-logs',
        {},
        { repeat: { pattern: '0 2 * * *' } }
    );

    //checking alerts every 2 mins
    await metricsQueue.add(
        'check-alerts',
        {},
        { repeat: { pattern: '*/2 * * * *' } }
    );

    console.log('Scheduled jobs setup complete!!!');
}
