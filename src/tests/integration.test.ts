import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const baseUrl = process.env.API_BASE_URL || 'http://localhost:8000';
const ingestionKey = process.env.INGESTION_API_KEY;
if (!ingestionKey) throw new Error('INGESTION_API_KEY is required for this integration check');

async function request(path: string, init?: RequestInit) {
    const response = await fetch(`${baseUrl}${path}`, init);
    return { response, body: await response.json() as any };
}

async function testApi() {
    const ingestion = await request('/api/logs', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': ingestionKey },
        body: JSON.stringify({ event_id: randomUUID(), service_name: 'integration-test', endpoint: '/integration-test', method: 'GET', status_code: 200, response_time: 42 })
    });
    assert.equal(ingestion.response.status, 202);
    assert.equal(ingestion.body.data.status, 'queued');
    console.log('Telemetry ingestion contract passed');
}

void testApi().catch(error => { console.error(error); process.exitCode = 1; });
