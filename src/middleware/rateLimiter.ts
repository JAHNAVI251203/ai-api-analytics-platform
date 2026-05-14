import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redis } from '../config/database';

//general rate limiter
export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, //15 mins
    max: 100, //limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
        sendCommand: async (...args: string[]) => {
            return redis.call(args[0]!, ...args.slice(1)) as Promise<any>;
        },
        prefix: 'rl:general:',
    }),
    message: 'Too many requests, please try again later.'
});

//strict limiter for log ingestion
export const logIngestionLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, //1 minute
    max: 1000, //1000 logs per minute
    store: new RedisStore({
        sendCommand: async (...args: string[]) => {
            return redis.call(args[0]!, ...args.slice(1)) as Promise<any>;
        },
        prefix: 'rl:logs:',
    }),
    message: 'Log ingestion rate limit exceeded.'
});

//API key based rate limiting 
export const createApiKeyLimiter = (requestsPerMinute: number) => {
    return rateLimit({
        windowMs: 60 * 1000,
        max: requestsPerMinute,
        keyGenerator: (req) => req.headers['x-api-key'] as string || req.ip || 'unknown',
        store: new RedisStore({
            sendCommand: async (...args: string[]) => {
                return redis.call(args[0]!, ...args.slice(1)) as Promise<any>;
            },
            prefix: 'rl:apikey:',
        }),
    });
};
