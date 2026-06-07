import { Request, Response } from 'express';
import { AlertModel } from '../models/AlertModel';
import { AlertService } from '../services/AlertService';

export class AlertController {
    static async createRule(req: Request, res: Response) {
        try {
            const rule = await AlertModel.createRule(req.body);
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