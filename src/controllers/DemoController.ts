import { Request, Response } from 'express';
import { metricsQueue } from '../jobs/metricsCalculator';

let scenarioRunning = false;

export class DemoController {
    static async run(_req: Request, res: Response) {
        if (scenarioRunning) {
            return res.status(409).json({ success: false, error: 'A demo scenario is already running.' });
        }

        scenarioRunning = true;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20_000);
        try {
            const demoUrl = (process.env.DEMO_API_URL || 'http://localhost:3001').replace(/\/$/, '');
            const result = await fetch(`${demoUrl}/run-scenario`, { method: 'POST', signal: controller.signal });
            if (!result.ok) throw new Error(`Demo API returned ${result.status}`);

            await Promise.all([
                metricsQueue.add('analyze-dashboard', {}, {
                    jobId: 'demo-dashboard-ai-refresh', delay: 15_000, removeOnComplete: true, removeOnFail: 10
                }),
                metricsQueue.add('detect-anomalies', {}, {
                    jobId: 'demo-anomaly-refresh', delay: 15_000, removeOnComplete: true, removeOnFail: 10
                })
            ]);
            return res.status(202).json({ success: true, data: { status: 'completed', requests: 20 } });
        } catch (error) {
            console.error('Demo scenario failed:', error);
            return res.status(502).json({ success: false, error: 'The Demo API could not run the scenario.' });
        } finally {
            clearTimeout(timeout);
            scenarioRunning = false;
        }
    }
}
