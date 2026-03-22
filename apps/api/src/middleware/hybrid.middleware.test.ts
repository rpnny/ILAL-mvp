import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';
process.env.API_KEY_SECRET = process.env.API_KEY_SECRET || 'test-api-key-secret';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./test.db';

const { hybridAuthMiddleware } = await import('./hybrid.middleware.ts');
const { prisma } = await import('../config/database.js');
const { generateAccessToken } = await import('../utils/jwt.js');
const { generateApiKey, hashApiKey, extractApiKeyPrefix } = await import('../utils/apiKey.js');

const origApiKeyFindMany = prisma.apiKey.findMany.bind(prisma.apiKey);
const origApiKeyUpdate = prisma.apiKey.update.bind(prisma.apiKey);
const origUserFindUnique = prisma.user.findUnique.bind(prisma.user);

afterEach(() => {
  prisma.apiKey.findMany = origApiKeyFindMany;
  prisma.apiKey.update = origApiKeyUpdate;
  prisma.user.findUnique = origUserFindUnique;
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

test('hybridAuth uses API Key when X-API-Key header is present', async () => {
  const apiKey = generateApiKey('live');
  const hashed = await hashApiKey(apiKey);
  const prefix = extractApiKeyPrefix(apiKey);
  const req = { headers: { 'x-api-key': apiKey } } as any;
  const res = createMockResponse();
  let nextCalled = false;

  prisma.apiKey.findMany = async () => [{
    id: 'k1', key: hashed, keyPrefix: prefix,
    userId: 'u1', permissions: 'verify', rateLimit: 10,
    isActive: 1, expiresAt: null,
    user: { id: 'u1', email: 'a@b.com', plan: 'FREE' },
  }] as any;
  prisma.apiKey.update = async () => ({} as any);

  await hybridAuthMiddleware(req, res as any, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(req.apiKey.userId, 'u1');
});

test('hybridAuth uses JWT when no X-API-Key header', async () => {
  const token = generateAccessToken({ userId: 'u1', email: 'a@b.com', plan: 'FREE' });
  const req = { headers: { authorization: `Bearer ${token}` } } as any;
  const res = createMockResponse();
  let nextCalled = false;

  prisma.user.findUnique = async () => ({ id: 'u1', email: 'a@b.com', plan: 'FREE' } as any);

  await hybridAuthMiddleware(req, res as any, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(req.user.userId, 'u1');
});

test('hybridAuth rejects when neither credential present', async () => {
  const req = { headers: {} } as any;
  const res = createMockResponse();
  let nextCalled = false;

  await hybridAuthMiddleware(req, res as any, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
});
