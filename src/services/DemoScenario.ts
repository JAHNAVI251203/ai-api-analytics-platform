export interface DemoScenarioEvent {
    endpoint: string;
    method: 'GET' | 'POST';
    statusCode: number;
    responseTime: number;
    startAfter: number;
}

const repeat = (event: Omit<DemoScenarioEvent, 'startAfter'>, count: number, startAfter: number) =>
    Array.from({ length: count }, () => ({ ...event, startAfter }));

export const demoScenario: DemoScenarioEvent[] = [
    ...repeat({ endpoint: '/products', method: 'GET', statusCode: 200, responseTime: 20 }, 6, 0),
    ...repeat({ endpoint: '/inventory', method: 'GET', statusCode: 200, responseTime: 30 }, 4, 300),
    ...repeat({ endpoint: '/orders', method: 'POST', statusCode: 201, responseTime: 150 }, 4, 600),
    ...repeat({ endpoint: '/orders/unknown', method: 'GET', statusCode: 404, responseTime: 50 }, 2, 900),
    ...repeat({ endpoint: '/reports', method: 'GET', statusCode: 200, responseTime: 350 }, 2, 1200),
    { endpoint: '/checkout', method: 'POST', statusCode: 500, responseTime: 450, startAfter: 1500 },
    { endpoint: '/export', method: 'GET', statusCode: 200, responseTime: 400, startAfter: 1800 },
];
