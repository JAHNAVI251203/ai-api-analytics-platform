import assert from 'node:assert/strict';
import { isAdminEmail } from '../middleware/auth';

assert.equal(isAdminEmail('admin@example.com', 'admin@example.com'), true);
assert.equal(isAdminEmail('Admin@Example.com', 'admin@example.com'), true);
assert.equal(isAdminEmail('user@example.com', 'admin@example.com'), false);
assert.equal(isAdminEmail('admin@example.com'), false);
