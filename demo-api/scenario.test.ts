import assert from 'node:assert/strict';
import { scenario } from './server';

assert.equal(scenario.length, 20);
const expectedCounts: Record<string, number> = {
    '/products': 6, '/inventory': 4, '/orders': 4, '/reports': 2,
    '/orders/unknown': 2, '/checkout': 1, '/export': 1,
};
for (const [path, count] of Object.entries(expectedCounts)) {
    assert.equal(scenario.filter(request => request.path === path).length, count, path);
}
console.log('Demo scenario definition is valid.');
