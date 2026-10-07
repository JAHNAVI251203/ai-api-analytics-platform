import { Request, Response } from 'express';
import { metricsQueue } from '../jobs/metricsCalculator';
import { runDemoScenario } from '../services/DemoScenarioService';

let scenarioRunning = false;

export class DemoController {
    static async run(_req: Request, res: Response) {
        if (scenarioRunning) {
            return res.status(409).json({ success: false, error: 'A demo scenario is already running.' });
        }

        scenarioRunning = true;
        try {
            const requests = await runDemoScenario();

            await Promise.all([
                metricsQueue.add('analyze-dashboard', {}, {
                    jobId: 'demo-dashboard-ai-refresh', delay: 15_000, removeOnComplete: true, removeOnFail: 10
                }),
                metricsQueue.add('detect-anomalies', {}, {
                    jobId: 'demo-anomaly-refresh', delay: 15_000, removeOnComplete: true, removeOnFail: 10
                })
            ]);
            return res.status(202).json({ success: true, data: { status: 'queued', requests } });
        } catch (error) {
            console.error('Demo scenario failed:', error);
            return res.status(500).json({ success: false, error: 'The demo scenario could not run.' });
        } finally {
            scenarioRunning = false;
        }
    }
}
