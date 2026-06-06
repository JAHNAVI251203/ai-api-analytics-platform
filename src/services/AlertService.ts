import { AlertModel } from '../models/AlertModel';
import { MetricsModel } from '../models/MetricsModel';

export class AlertService {
    static async checkAlerts() {
        const rules = await AlertModel.getActiveRules();
        
        for (const rule of rules) {
            const shouldAlert = await this.evaluateRule(rule);
            
            if (shouldAlert) {
                await this.sendAlert(rule, shouldAlert);
            }
        }
    }
    
    private static async evaluateRule(rule: any) {
        const metrics = await MetricsModel.getOverallStats(rule.time_window);
        
        switch (rule.condition_type) {
            case 'error_rate':
                const errorRate = (metrics.error_count / metrics.total_requests) * 100;
                if (errorRate > rule.threshold) {
                    return {
                        type: 'error_rate',
                        value: errorRate,
                        threshold: rule.threshold,
                        message: `Error rate ${errorRate.toFixed(2)}% exceeds threshold ${rule.threshold}%`
                    };
                }
                break;
                
            case 'latency':
                if (metrics.avg_response_time > rule.threshold) {
                    return {
                        type: 'latency',
                        value: metrics.avg_response_time,
                        threshold: rule.threshold,
                        message: `Average latency ${metrics.avg_response_time}ms exceeds threshold ${rule.threshold}ms`
                    };
                }
                break;
                
            case 'traffic_spike':
                // Compare with baseline (stored in Redis)
                const baseline = 5000; // You'd fetch this from historical data
                const currentTraffic = metrics.total_requests;
                const percentIncrease = ((currentTraffic - baseline) / baseline) * 100;
                
                if (percentIncrease > rule.threshold) {
                    return {
                        type: 'traffic_spike',
                        value: percentIncrease,
                        threshold: rule.threshold,
                        message: `Traffic increased ${percentIncrease.toFixed(2)}% above baseline`
                    };
                }
                break;
        }
        
        return null;
    }
    
    private static async sendAlert(rule: any, alertData: any) {
        const payload = {
            rule: rule.name,
            severity: alertData.value > rule.threshold * 1.5 ? 'high' : 'medium',
            message: alertData.message,
            timestamp: new Date().toISOString(),
            data: alertData
        };
        
        try {
            const response = await fetch(rule.webhook_url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            const responseData = await response.text();
            
            await AlertModel.logAlert(rule.id, payload, {
                status: response.status,
                response: responseData
            });
            
            console.log(`Alert sent: ${rule.name}`);
        } catch (error: any) {
            console.error('Failed to send alert:', error);
            
            await AlertModel.logAlert(rule.id, payload, {
                error: error.message
            });
        }
    }
}