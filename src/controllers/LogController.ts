import { Request, Response } from 'express';
import { telemetryQueue } from '../jobs/telemetryQueue';

const methods = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

interface LogInput {
    event_id: string;
    service_name: string;
    endpoint: string;
    method: string;
    status_code: number;
    response_time: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const isValidLog = (body: unknown): body is LogInput =>
    isRecord(body) &&
    typeof body.event_id === 'string' && /^[0-9a-f-]{36}$/i.test(body.event_id) &&
    typeof body.service_name === 'string' && body.service_name.trim().length > 0 && body.service_name.length <= 100 &&
    typeof body.endpoint === 'string' && body.endpoint.trim().length > 0 && body.endpoint.length <= 255 &&
    typeof body.method === 'string' && methods.has(body.method.toUpperCase()) &&
    typeof body.status_code === 'number' && Number.isInteger(body.status_code) && body.status_code >= 100 && body.status_code <= 599 &&
    typeof body.response_time === 'number' && Number.isInteger(body.response_time) && body.response_time >= 0;

export class LogController {
    static async ingestLog(req: Request, res: Response) {
        try {
            const body: unknown = req.body;
            if (!isValidLog(body)) {
                return res.status(400).json({
                    success: false,
                    error: 'Event ID, service name, endpoint, HTTP method, status code, and non-negative response time are required.'
                });
            }

            const logData = {
                event_id: body.event_id,
                service_name: body.service_name.trim(),
                endpoint: body.endpoint.trim(),
                method: body.method.toUpperCase(),
                status_code: body.status_code,
                response_time: body.response_time,
            };

            await telemetryQueue.add('persist-telemetry', logData, {
                jobId: logData.event_id,
                attempts: 5,
                backoff: { type: 'exponential', delay: 1000 },
                removeOnComplete: 100,
                removeOnFail: 100
            });
            res.status(202).json({ success: true, data: { eventId: logData.event_id, status: 'queued' } });
        } catch (error) {
            console.error('Error ingesting log:', error);
            res.status(500).json({ success: false, error: 'Failed to ingest log' });
        }
    }
}
