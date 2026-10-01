import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import "./config/database";
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { runMigrations } from "./migrations/init";

import logRoutes from './routes/logRoutes';
import metricsRoutes from './routes/metricsRoutes';
import aiRoutes from './routes/aiRoutes';
import alertRoutes from './routes/alertRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import authRoutes from './routes/authRoutes';
import { authenticateJwt, isAdminEmail, isTokenRevoked, requireAdmin, verifyJwt } from './middleware/auth';

import { generalLimiter, loginLimiter, logIngestionLimiter } from './middleware/rateLimiter';

import { metricsQueue } from './jobs/metricsCalculator';
import { telemetryQueue } from './jobs/telemetryQueue';

import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { redis, pool } from './config/database';


const app = express();
app.set("trust proxy", 1);
const httpServer = createServer(app);
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"]
    },
    allowRequest: (req, callback) =>
        callback(null, !req.headers.origin || allowedOrigins.includes(req.headers.origin))
});

io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (typeof token !== 'string') {
        return next(new Error('Authentication required'));
    }

    try {
        const auth = verifyJwt(token);
        if (await isTokenRevoked(auth)) {
            return next(new Error('Invalid or expired token'));
        }
        socket.data.user = auth;
        next();
    } catch {
        next(new Error('Invalid or expired token'));
    }
});

app.use(express.json());
app.use(cors({ origin: allowedOrigins }));

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
    
    socket.on('subscribe', (channel) => {
        if ((channel === 'logs' || channel === 'alerts') && isAdminEmail(socket.data.user.email)) {
            socket.join(channel);
        }
    });
});

app.set('io', io);

const serverAdapter = new ExpressAdapter();
createBullBoard({
    queues: [new BullMQAdapter(metricsQueue), new BullMQAdapter(telemetryQueue)],
    serverAdapter
});

serverAdapter.setBasePath('/admin/queues');
app.use('/admin/queues', authenticateJwt, requireAdmin, serverAdapter.getRouter());

const apiPaths = ['/auth', '/logs', '/metrics', '/errors', '/ai', '/alerts', '/dashboard'];
const protectedApiPaths = ['/metrics', '/errors', '/ai', '/dashboard'];

app.use(apiPaths, generalLimiter);
app.use('/auth/login', loginLimiter);
app.use('/auth', authRoutes);
app.use(protectedApiPaths, authenticateJwt);
app.use('/logs', logIngestionLimiter);
app.use('/', logRoutes);
app.use('/', metricsRoutes);
app.use("/ai", aiRoutes);
app.use("/alerts", authenticateJwt, requireAdmin, alertRoutes);
app.use("/dashboard", dashboardRoutes);

const realtimeSubscriber = redis.duplicate();
void realtimeSubscriber.subscribe('realtime:telemetry');
realtimeSubscriber.on('message', (_channel, message) => {
    try {
        const { log, error } = JSON.parse(message) as { log: unknown; error: unknown };
        io.to('logs').emit('new-log', { timestamp: new Date(), log });
        if (error) io.to('alerts').emit('error-alert', { timestamp: new Date(), error });
    } catch {
        console.error('Invalid realtime telemetry event');
    }
});

/*app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
}); */

app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        await redis.ping();
        res.json({ 
            status: 'healthy', 
            timestamp: new Date(),
            uptime: process.uptime()
        });
    } catch (error: unknown) {
        console.error('Health check failed:', error);
        res.status(503).json({ 
            status: 'unhealthy'
        });
    }
});

const PORT = process.env.PORT || 8000;

const start = async () => {
    try {
        await runMigrations();
        httpServer.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Server startup failed:', error);
        process.exit(1);
    }
};

void start();

export { io };
