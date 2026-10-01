import { redis } from '../config/database';

const ranges = ['1 hour', '6 hours', '24 hours', '7 days'];

export async function invalidateAnalyticsCache() {
    const keys = ranges.flatMap(range => [
        `dashboard:${range}`,
        `metrics:${range}`,
        `ai:summary:${range}`
    ]);
    await redis.del(...keys, 'ai:error-analysis', 'ai:anomaly-detection');
}
