import { Request, Response } from 'express';
import { LogModel } from '../models/LogModel';
import { ErrorModel } from '../models/ErrorModel';
import { RealtimeService } from '../services/RealtimeService';

export class LogController {
    static async ingestLog(req: Request, res: Response) {
        try {
            const logData = {
                endpoint: req.body.endpoint,
                method: req.body.method,
                status_code: req.body.status_code,
                response_time: req.body.response_time,
                request_body: req.body.request_body,
                response_body: req.body.response_body,
                user_agent: String(req.headers['user-agent'] || ''),
                ip_address: String(req.ip || '')
            };

            const log = await LogModel.create(logData);

            const io = req.app.get('io');
            const realtimeService = new RealtimeService(io);
            realtimeService.emitNewLog(log);

            if (logData.status_code >= 400) {
                const error = await ErrorModel.trackError(
                    logData.endpoint,
                    logData.method,
                    logData.status_code,
                    logData.response_body
                );
                realtimeService.emitErrorAlert(error);
            }
            res.status(201).json({ success: true, data: log });
        } catch (error) {
            console.error('Error ingesting log:', error);
            res.status(500).json({ success: false, error: 'Failed to ingest log' });
        }
    }
}