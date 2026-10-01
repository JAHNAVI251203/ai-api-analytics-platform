import { Request, Response } from 'express';
import { AlertModel, type AlertRule } from '../models/AlertModel';
import { AlertService } from '../services/AlertService';
import { isTimeRange } from '../models/MetricsModel';
import { isAllowedWebhookUrl } from '../services/WebhookPolicy';

type AlertRuleInput = AlertRule;

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const isValidRule = (body: unknown): body is AlertRuleInput =>
    isRecord(body) &&
    typeof body.name === 'string' && body.name.trim().length > 0 && body.name.length <= 255 &&
    (body.condition_type === 'error_rate' || body.condition_type === 'latency' || body.condition_type === 'traffic_spike') &&
    typeof body.threshold === 'number' && Number.isFinite(body.threshold) && body.threshold >= 0 &&
    isTimeRange(body.time_window) && isAllowedWebhookUrl(body.webhook_url);

export class AlertController {
    static async createRule(req: Request, res: Response) {
        try {
            const body: unknown = req.body;
            if (!isValidRule(body)) {
                return res.status(400).json({
                    success: false,
                    error: 'Enter a name, supported condition and time range, non-negative threshold, and an HTTPS webhook URL on an allowed host.'
                });
            }

            const rule = await AlertModel.createRule({
                ...body,
                name: body.name.trim(),
                webhook_url: body.webhook_url.trim()
            });
            res.status(201).json({ success: true, data: rule });
        } catch (error) {
            console.error("CREATE RULE ERROR:", error);
            res.status(500).json({success: false, error: 'Failed to create alert rule' });
        }
    }

    static async getRules(req: Request, res: Response) {
        try {
            const rules = await AlertModel.getActiveRules();
            res.json({ success: true, data: rules });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Failed to fetch rules' });
        }
    }

    static async testAlert(req: Request, res: Response) {
        try {
            await AlertService.checkAlerts();
            res.json({ success: true, message: 'Alert check triggered' });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Alert check failed' });
        }
    }
}
