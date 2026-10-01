import { AlertModel } from '../models/AlertModel';
import { MetricsModel } from '../models/MetricsModel';
import { redis } from '../config/database';
import { isAllowedWebhookUrl, isPublicWebhookHost } from './WebhookPolicy';

const ALERT_COOLDOWN_SECONDS = 15 * 60;

export class AlertService {
    private static async readResponse(response: Response) {
        const reader = response.body?.getReader();
        if (!reader) return '';
        const chunks: Uint8Array[] = [];
        let size = 0;
        while (size < 4096) {
            const { done, value } = await reader.read();
            if (done || !value) break;
            chunks.push(value);
            size += value.byteLength;
        }
        await reader.cancel();
        const bytes = new Uint8Array(Math.min(size, 4096));
        let offset = 0;
        for (const chunk of chunks) {
            const part = chunk.subarray(0, bytes.length - offset);
            bytes.set(part, offset);
            offset += part.length;
            if (offset === bytes.length) break;
        }
        return new TextDecoder().decode(bytes);
    }

    static async checkAlerts() {
        for (const rule of await AlertModel.getActiveRules()) {
            const alert = await this.evaluateRule(rule);
            if (alert) await this.sendAlert(rule, alert);
        }
    }

    private static async evaluateRule(rule: any) {
        const metrics = await MetricsModel.getOverallStats(rule.time_window);
        const total = Number(metrics.total_requests);
        if (!total) return null;
        if (rule.condition_type === 'error_rate') {
            const value = (Number(metrics.error_count) / total) * 100;
            return value > rule.threshold ? { type: 'error_rate', value, threshold: rule.threshold, message: `Error rate ${value.toFixed(2)}% exceeds threshold ${rule.threshold}%` } : null;
        }
        if (rule.condition_type === 'latency') {
            const value = Number(metrics.avg_response_time);
            return value > rule.threshold ? { type: 'latency', value, threshold: rule.threshold, message: `Average latency ${value}ms exceeds threshold ${rule.threshold}ms` } : null;
        }
        const baseline = await MetricsModel.getHistoricalBaseline();
        const hours = rule.time_window === '6 hours' ? 6 : rule.time_window === '24 hours' ? 24 : rule.time_window === '7 days' ? 168 : 1;
        const expected = Number(baseline.requests_per_hour) * hours;
        if (!baseline.ready || !expected) return null;
        const value = ((total - expected) / expected) * 100;
        return value > rule.threshold ? { type: 'traffic_spike', value, threshold: rule.threshold, message: `Traffic increased ${value.toFixed(2)}% above the historical baseline` } : null;
    }

    private static async sendAlert(rule: any, data: any) {
        if (!isAllowedWebhookUrl(rule.webhook_url) || !await isPublicWebhookHost(rule.webhook_url)) return;
        const cooldownKey = `alert:cooldown:${rule.id}`;
        if (await redis.set(cooldownKey, '1', 'EX', ALERT_COOLDOWN_SECONDS, 'NX') !== 'OK') return;
        const payload = { rule: rule.name, severity: data.value > rule.threshold * 1.5 ? 'high' : 'medium', message: data.message, timestamp: new Date().toISOString(), data };
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
            const response = await fetch(rule.webhook_url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), redirect: 'error', signal: controller.signal });
            const body = await this.readResponse(response);
            await AlertModel.logAlert(rule.id, payload, { status: response.status, response: body });
            if (!response.ok) await redis.del(cooldownKey);
        } catch (error) {
            await redis.del(cooldownKey);
            await AlertModel.logAlert(rule.id, payload, { error: error instanceof Error ? error.message : 'Delivery failed' });
        } finally { clearTimeout(timeout); }
    }
}
