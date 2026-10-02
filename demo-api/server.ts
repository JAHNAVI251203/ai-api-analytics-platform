import http, { type IncomingMessage, type ServerResponse } from 'http';
import { randomUUID } from 'crypto';

type ScenarioRequest = { path: string; method: 'GET' | 'POST'; startAfter: number };
type DemoResponse = { status: number; delay: number; body: unknown | (() => unknown) };

const port = Number(process.env.PORT || 3001);
const sentinelUrl = process.env.API_SENTINEL_URL || 'http://localhost:8000';
const apiKey = process.env.API_SENTINEL_INGESTION_KEY;

export const scenario: ScenarioRequest[] = [
    ...Array.from({ length: 6 }, () => ({ path: '/products', method: 'GET' as const, startAfter: 0 })),
    ...Array.from({ length: 4 }, () => ({ path: '/inventory', method: 'GET' as const, startAfter: 300 })),
    ...Array.from({ length: 4 }, () => ({ path: '/orders', method: 'POST' as const, startAfter: 600 })),
    ...Array.from({ length: 2 }, () => ({ path: '/orders/unknown', method: 'GET' as const, startAfter: 900 })),
    ...Array.from({ length: 2 }, () => ({ path: '/reports', method: 'GET' as const, startAfter: 1200 })),
    { path: '/checkout', method: 'POST', startAfter: 1500 },
    { path: '/export', method: 'GET', startAfter: 1800 },
];

const responses: Record<string, DemoResponse> = {
    'GET /products': { status: 200, delay: 20, body: { products: [{ id: 1, name: 'Notebook', price: 12 }] } },
    'GET /inventory': { status: 200, delay: 30, body: { available: 42 } },
    'POST /orders': { status: 201, delay: 150, body: () => ({ orderId: randomUUID() }) },
    'GET /reports': { status: 200, delay: 1500, body: { generated: true } },
    'GET /orders/unknown': { status: 404, delay: 50, body: { error: 'Order not found' } },
    'POST /checkout': { status: 500, delay: 5000, body: { error: 'Checkout service unavailable' } },
    'GET /export': { status: 200, delay: 10000, body: { exported: true } },
    'GET /health': { status: 200, delay: 0, body: { status: 'ok' } },
};

const trackedPaths = new Set(scenario.map(request => request.path));
let scenarioRunning = false;
const wait = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

function report(req: IncomingMessage, res: ServerResponse, started: number, endpoint: string) {
    if (!apiKey || !trackedPaths.has(endpoint)) return;
    const body = JSON.stringify({
        event_id: randomUUID(), service_name: 'demo-api', endpoint, method: req.method,
        status_code: res.statusCode, response_time: Date.now() - started
    });
    void fetch(`${sentinelUrl}/logs`, {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': apiKey }, body
    }).catch(() => console.error('Telemetry delivery failed'));
}

function sendJson(res: ServerResponse, response: DemoResponse) {
    const body = typeof response.body === 'function' ? response.body() : response.body;
    res.statusCode = response.status;
    res.setHeader('content-type', 'application/json');
    setTimeout(() => res.end(JSON.stringify(body)), response.delay);
}

async function runScenario() {
    if (scenarioRunning) throw new Error('A demo scenario is already running.');
    scenarioRunning = true;
    try {
        await Promise.all(scenario.map(async ({ path, method, startAfter }) => {
            await wait(startAfter);
            await fetch(`http://127.0.0.1:${port}${path}`, method === 'POST' ? { method, body: '{}' } : { method });
        }));
    } finally {
        scenarioRunning = false;
    }
}

export function createServer() {
    return http.createServer((req, res) => {
        const started = Date.now();
        const pathname = new URL(req.url || '/', 'http://localhost').pathname;
        res.on('finish', () => report(req, res, started, pathname));

        if (pathname === '/run-scenario' && req.method === 'POST') {
            void runScenario()
                .then(() => { res.statusCode = 202; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ status: 'completed', requests: scenario.length })); })
                .catch((error: Error) => { res.statusCode = 409; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ error: error.message })); });
            return;
        }

        const response = responses[`${req.method} ${pathname}`];
        if (response) return sendJson(res, response);
        return sendJson(res, { status: 404, delay: 50, body: { error: 'Not found' } });
    });
}

if (require.main === module) createServer().listen(port, () => console.log(`Demo API on ${port}`));
