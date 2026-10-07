import assert from 'node:assert/strict';
import { demoScenario } from '../services/DemoScenario';

assert.equal(demoScenario.length, 20);

const expectedCounts: Record<string, number> = {
    '/products': 6, '/inventory': 4, '/orders': 4, '/reports': 2,
    '/orders/unknown': 2, '/checkout': 1, '/export': 1,
};

for (const [endpoint, count] of Object.entries(expectedCounts)) {
    assert.equal(demoScenario.filter(event => event.endpoint === endpoint).length, count, endpoint);
}

assert.equal(demoScenario.filter(event => event.statusCode >= 400).length, 3);
console.log('Demo scenario definition is valid.');
