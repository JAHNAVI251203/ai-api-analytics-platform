import { NextFunction, Request, Response } from 'express';
import crypto from 'crypto';

export const authenticateIngestionKey = (req: Request, res: Response, next: NextFunction) => {
    const expected = process.env.INGESTION_API_KEY;
    const provided = req.header('x-api-key');

    const valid = Boolean(expected && provided && expected.length === provided.length &&
        crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided)));
    if (!valid) {
        return res.status(401).json({ success: false, error: 'Invalid ingestion API key' });
    }

    next();
};
