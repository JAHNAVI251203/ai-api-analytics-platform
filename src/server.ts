import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import "./config/database";
import { createServer } from 'http';
import { Server } from 'socket.io';

import logRoutes from './routes/logRoutes';
import metricsRoutes from './routes/metricsRoutes';
import aiRoutes from './routes/aiRoutes';
import alertRoutes from './routes/alertRoutes';

import { generalLimiter, logIngestionLimiter } from './middleware/rateLimiter';

import { setupScheduledJobs } from './jobs/scheduler';
import { metricsQueue } from './jobs/metricsCalculator';

import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

app.use(express.json());

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
    
    socket.on('subscribe', (channel) => {
        socket.join(channel);
        console.log(`Socket ${socket.id} subscribed to ${channel}`);
    });
});

app.set('io', io);

const serverAdapter = new ExpressAdapter();
createBullBoard({
    queues: [new BullMQAdapter(metricsQueue)],
    serverAdapter
});

serverAdapter.setBasePath('/admin/queues');
app.use('/admin/queues', serverAdapter.getRouter());

app.use('/api', generalLimiter);
app.use('/api/logs', logIngestionLimiter);
app.use('/api', logRoutes);
app.use('/api', metricsRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/alerts", alertRoutes);


app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

const PORT = process.env.PORT || 8000;
httpServer.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    await setupScheduledJobs();
});

export { io };