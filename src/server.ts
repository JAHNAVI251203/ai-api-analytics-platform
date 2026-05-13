import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import "./config/database";

import logRoutes from './routes/logRoutes';
import metricsRoutes from './routes/metricsRoutes';

import { generalLimiter, logIngestionLimiter } from './middleware/rateLimiter';

const app = express();

app.use(express.json());

app.use('/api', generalLimiter);
app.use('/api/logs', logIngestionLimiter);
app.use('/api', logRoutes);
app.use('/api', metricsRoutes);


app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});