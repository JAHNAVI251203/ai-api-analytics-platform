import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import "./config/database";
import { createServer } from 'http';
import { Server } from 'socket.io';


import logRoutes from './routes/logRoutes';
import metricsRoutes from './routes/metricsRoutes';
import aiRoutes from './routes/aiRoutes';

import { generalLimiter, logIngestionLimiter } from './middleware/rateLimiter';

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

app.use('/api', generalLimiter);
app.use('/api/logs', logIngestionLimiter);
app.use('/api', logRoutes);
app.use('/api', metricsRoutes);
app.use("/api/ai", aiRoutes);


app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

const PORT = process.env.PORT || 8000;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

export { io };