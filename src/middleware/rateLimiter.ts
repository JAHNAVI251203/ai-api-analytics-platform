import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../config/database';

// General rate limiter
export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
        client: redis,
        prefix: 'rl:general:'
    }),
    message: 'Too many requests, please try again later.'
});

// Strict limiter for log ingestion
export const logIngestionLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 1000, // 1000 logs per minute
    store: new RedisStore({
        client: redis,
        prefix: 'rl:logs:'
    }),
    message: 'Log ingestion rate limit exceeded.'
});

// API key based rate limiting (for future use)
export const createApiKeyLimiter = (requestsPerMinute: number) => {
    return rateLimit({
        windowMs: 60 * 1000,
        max: requestsPerMinute,
        keyGenerator: (req) => req.headers['x-api-key'] as string || req.ip,
        store: new RedisStore({
            client: redis,
            prefix: 'rl:apikey:'
        })
    });
};