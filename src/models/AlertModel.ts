import { pool } from '../config/database';

export interface AlertRule {
    name: string;
    condition_type: 'error_rate' | 'latency' | 'traffic_spike';
    threshold: number;
    time_window: string;
    webhook_url: string;
}

export class AlertModel {
    static async createRule(rule: AlertRule) {
        const query = `
            INSERT INTO alert_rules (name, condition_type, threshold, time_window, webhook_url)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        
        const result = await pool.query(query, [
            rule.name,
            rule.condition_type,
            rule.threshold,
            rule.time_window,
            rule.webhook_url
        ]);
        
        return result.rows[0];
    }
    
    static async getActiveRules() {
        const query = 'SELECT * FROM alert_rules WHERE is_active = true';
        const result = await pool.query(query);
        return result.rows;
    }
    
    static async logAlert(ruleId: number, alertData: any, webhookResponse: any) {
        const query = `
            INSERT INTO alert_history (rule_id, alert_data, webhook_response)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
        
        const result = await pool.query(query, [
            ruleId,
            JSON.stringify(alertData),
            JSON.stringify(webhookResponse)
        ]);
        
        return result.rows[0];
    }
}