import { randomUUID } from 'crypto';
import { enqueueTelemetry } from '../jobs/telemetryQueue';
import { demoScenario } from './DemoScenario';

const wait = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

export async function runDemoScenario() {
    await Promise.all(demoScenario.map(async ({ startAfter, responseTime, endpoint, method, statusCode }) => {
        await wait(startAfter + responseTime);
        await enqueueTelemetry({
            event_id: randomUUID(),
            service_name: 'demo-scenario',
            endpoint,
            method,
            status_code: statusCode,
            response_time: responseTime,
        });
    }));

    return demoScenario.length;
}
