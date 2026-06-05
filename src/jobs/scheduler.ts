import { metricsQueue } from './metricsCalculator';

export async function setupScheduledJobs() {
    //calculating metrics every 5 minutes
    await metricsQueue.add(
        'calculate-hourly-metrics',
        {},
        {repeat: { pattern: '*/5 * * * *' }}
    );
    
    //detecting anomalies every 10 minutes
    await metricsQueue.add(
        'detect-anomalies',
        {},
        {repeat: { pattern: '*/10 * * * *'}}
    );
    
    //cleaning up old logs at 2 AM everday
    await metricsQueue.add(
        'cleanup-old-logs',
        {},
        {repeat: {pattern: '0 2 * * *'}}
    );
    
    console.log('Scheduled jobs setup complete!!!');
}