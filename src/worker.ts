import 'dotenv/config';
import { runMigrations } from './migrations/init';
import { startTelemetryWorker } from './jobs/telemetryQueue';

async function start() {
    process.env.APP_ROLE = 'worker';
    await runMigrations();
    startTelemetryWorker();
    const { setupScheduledJobs } = await import('./jobs/scheduler');
    await setupScheduledJobs();
    console.log('API Sentinel worker started');
}

void start().catch(error => {
    console.error('Worker startup failed:', error);
    process.exit(1);
});
