import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../config/database';

//general rate limiter
export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, //15 mins
    max: 100, //limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
        //client: redis,
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
        //client: redis,
        sendCommand: async (...args: string[]) => {
            return redis.call(args[0]!, ...args.slice(1)) as Promise<any>;
        },
    prefix: 'rl:logs:',
    }),
    keyGenerator: (req) => req.header('x-api-key') || req.ip || 'unknown',
    message: 'Log ingestion rate limit exceeded.'
});

export const loginLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 5,
        keyGenerator: (req) =>
            typeof req.body?.email === 'string'
                ? req.body.email.trim().toLowerCase()
                : 'invalid-login',
        store: new RedisStore({
            sendCommand: async (...args: string[]) => {
                return redis.call(args[0]!, ...args.slice(1)) as Promise<any>;
            },
            prefix: 'rl:login:',
        }),
        message: { success: false, error: 'Too many sign-in attempts. Please try again later.' }
    });
