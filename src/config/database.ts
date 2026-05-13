import { Pool } from 'pg';
import Redis from 'ioredis';

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing");
}

export const redis = new Redis(process.env.REDIS_URL as string);

// Test connections
pool.query('SELECT NOW()', (err, res) => {
    if (err) console.error('PostgreSQL connection error:', err);
    else console.log('PostgreSQL connected:', res.rows[0]);
});

redis.on('connect', () => console.log('Redis connected'));
redis.on('error', (err) => console.error('Redis error:', err));