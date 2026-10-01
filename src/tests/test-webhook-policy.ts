import assert from 'node:assert/strict';
import { isAllowedWebhookUrl } from '../services/WebhookPolicy';

const allowlist = 'hooks.example.com,*.webhook.site';

assert.equal(isAllowedWebhookUrl('https://hooks.example.com/alerts', allowlist), true);
assert.equal(isAllowedWebhookUrl('https://abc.webhook.site/token', allowlist), true);
assert.equal(isAllowedWebhookUrl('https://webhook.site/token', allowlist), true);
assert.equal(isAllowedWebhookUrl('https://evil.example.com', allowlist), false);
assert.equal(isAllowedWebhookUrl('http://localhost:8000', allowlist), false);
assert.equal(isAllowedWebhookUrl('https://hooks.example.com:8443', allowlist), false);
assert.equal(isAllowedWebhookUrl('https://hooks.example.com@evil.example.com', allowlist), false);
assert.equal(isAllowedWebhookUrl('https://hooks.example.com', ''), false);

console.log('Webhook policy tests passed');
