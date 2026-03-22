import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.API_KEY_SECRET = process.env.API_KEY_SECRET || 'test-api-key-secret';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./test.db';

const { apiKeyMiddleware, requirePermission } = await import('./apikey.middleware.ts');
const { prisma } = await import('../config/database.js');
const { generateApiKey, hashApiKey, extractApiKeyPrefix } = await import('../utils/apiKey.js');

const origApiKeyFindMany = prisma.apiKey.findMany.bind(prisma.apiKey);
const origApiKeyUpdate = prisma.apiKey.update.bind(prisma.apiKey);

afterEach(() => {
  prisma.apiKey.findMany = origApiKeyFindMany;
  prisma.apiKey.update = origApiKeyUpdate;
});

type MockResponse = {
  statusCode: number;
  body: unknown;
  status: (code: number) => MockResponse;
  json: (payload: unknown) => MockResponse;
};

function createMockResponse(): MockResponse {
  return {
    statusCode: 200,
    body: undefined,
    status(code: number) { this.statusCode = code; return this; },
    json(payload: unknown) { this.body = payload; return this; },
  };
}

test('apiKeyMiddleware rejects missing X-API-Key header', async () => {
  const req = { headers: {} } as any;
  const res = createMockResponse();
  let nextCalled = false;

  await apiKeyMiddleware(req, res as any, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.ok((res.body as any).message.includes('Missing'));
});

test('apiKeyMiddleware rejects invalid format', async () => {
  const req = { headers: { 'x-api-key': 'bad-format' } } as any;
  const res = createMockResponse();
  let nextCalled = false;

  await apiKeyMiddleware(req, res as any, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.ok((res.body as any).message.includes('format'));
});

test('apiKeyMiddleware rejects key not found in DB', async () => {
  const apiKey = generateApiKey('live');
  const req = { headers: { 'x-api-key': apiKey } } as any;
  const res = createMockResponse();
  let nextCalled = false;

  prisma.apiKey.findMany = async () => [];

  await apiKeyMiddleware(req, res as any, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.ok((res.body as any).message.includes('Invalid'));
});

test('apiKeyMiddleware passes with valid key', async () => {
  const apiKey = generateApiKey('live');
  const hashedKey = await hashApiKey(apiKey);
  const prefix = extractApiKeyPrefix(apiKey);
  const req = { headers: { 'x-api-key': apiKey } } as any;
  const res = createMockResponse();
  let nextCalled = false;

  prisma.apiKey.findMany = async () => [{
    id: 'k1', key: hashedKey, keyPrefix: prefix,
    userId: 'u1', permissions: 'verify,session', rateLimit: 10,
    isActive: 1, expiresAt: null,
    user: { id: 'u1', email: 'a@b.com', plan: 'FREE' },
  }] as any;
  prisma.apiKey.update = async () => ({} as any);

  await apiKeyMiddleware(req, res as any, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(req.apiKey.userId, 'u1');
  assert.ok(req.apiKey.permissions.includes('verify'));
  assert.equal(req.user.userId, 'u1');
});

test('apiKeyMiddleware rejects expired key', async () => {
  const apiKey = generateApiKey('live');
  const hashedKey = await hashApiKey(apiKey);
  const prefix = extractApiKeyPrefix(apiKey);
  const req = { headers: { 'x-api-key': apiKey } } as any;
  const res = createMockResponse();
  let nextCalled = false;

  prisma.apiKey.findMany = async () => [{
    id: 'k1', key: hashedKey, keyPrefix: prefix,
    userId: 'u1', permissions: 'verify', rateLimit: 10,
    isActive: 1, expiresAt: new Date(Date.now() - 86400000).toISOString(),
    user: { id: 'u1', email: 'a@b.com', plan: 'FREE' },
  }] as any;

  await apiKeyMiddleware(req, res as any, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.ok((res.body as any).message.includes('expired'));
});

// ── requirePermission ──

test('requirePermission passes when permission exists', () => {
  const middleware = requirePermission('verify');
  const req = { apiKey: { permissions: ['verify', 'session'] } } as any;
  const res = createMockResponse();
  let nextCalled = false;

  middleware(req, res as any, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});

test('requirePermission rejects missing permission', () => {
  const middleware = requirePermission('admin');
  const req = { apiKey: { permissions: ['verify'] } } as any;
  const res = createMockResponse();
  let nextCalled = false;

  middleware(req, res as any, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
});

test('requirePermission rejects when no apiKey attached', () => {
  const middleware = requirePermission('verify');
  const req = {} as any;
  const res = createMockResponse();
  let nextCalled = false;

  middleware(req, res as any, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
});
