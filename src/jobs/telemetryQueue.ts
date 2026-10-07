import { Job, Queue, Worker } from 'bullmq';
import { pool, redis } from '../config/database';
import { ErrorModel } from '../models/ErrorModel';
import { LogModel, type ApiLog } from '../models/LogModel';
import { invalidateAnalyticsCache } from '../services/CacheService';

export const telemetryQueue = new Queue<ApiLog>('telemetry-ingestion', { connection: redis });

export function enqueueTelemetry(log: ApiLog) {
    return telemetryQueue.add('persist-telemetry', log, {
        jobId: log.event_id,
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 100
    });
}

export function startTelemetryWorker() {
    const worker = new Worker<ApiLog>('telemetry-ingestion', async (job: Job<ApiLog>) => {
        const client = await pool.connect();
        let log: any;
        let error: any;
        let inserted = false;
        try {
            await client.query('BEGIN');
            log = await LogModel.createIfAbsent(job.data, client);
            inserted = Boolean(log);
            if (inserted && job.data.status_code >= 400) error = await ErrorModel.trackError(job.data.endpoint, job.data.method, job.data.status_code, client);
            await client.query('COMMIT');
        } catch (cause) {
            await client.query('ROLLBACK');
            throw cause;
        } finally { client.release(); }

        log ||= await LogModel.findByEventId(job.data.event_id);
        await invalidateAnalyticsCache();
        if (log) await redis.publish('realtime:telemetry', JSON.stringify({ log, error }));
        return { logId: log?.id, inserted };
    }, { connection: redis, concurrency: 5 });
    worker.on('failed', (job, error) => console.error(`Telemetry job ${job?.id} failed:`, error));
    return worker;
}
