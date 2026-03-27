import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.API_KEY_SECRET = process.env.API_KEY_SECRET || 'test-api-key-secret';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./test.db';

const { listApiKeys, createApiKey, deleteApiKey, updateApiKey } = await import('./apikey.controller.ts');
const { prisma } = await import('../config/database.js');

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

const origApiKeyFindMany = prisma.apiKey.findMany.bind(prisma.apiKey);
const origApiKeyCount = prisma.apiKey.count.bind(prisma.apiKey);
const origApiKeyCreate = prisma.apiKey.create.bind(prisma.apiKey);
const origApiKeyFindFirst = prisma.apiKey.findFirst.bind(prisma.apiKey);
const origApiKeyUpdate = prisma.apiKey.update.bind(prisma.apiKey);

afterEach(() => {
  prisma.apiKey.findMany = origApiKeyFindMany;
  prisma.apiKey.count = origApiKeyCount;
  prisma.apiKey.create = origApiKeyCreate;
  prisma.apiKey.findFirst = origApiKeyFindFirst;
  prisma.apiKey.update = origApiKeyUpdate;
});

const authedReq = (extra?: object) => ({
  user: { userId: 'u1', email: 'a@b.com', plan: 'FREE' },
  ...extra,
} as any);

// ── listApiKeys ──

test('listApiKeys returns keys for authenticated user', async () => {
  const res = createMockResponse();
  prisma.apiKey.findMany = async () => [
    { id: 'k1', name: 'key1', keyPrefix: 'ilal_live', permissions: 'verify', rateLimit: 10, isActive: true, lastUsedAt: null, createdAt: new Date().toISOString(), expiresAt: null },
  ] as any;

  await listApiKeys(authedReq(), res as any);
  assert.equal(res.statusCode, 200);
  assert.equal((res.body as any).apiKeys.length, 1);
});

test('listApiKeys rejects unauthenticated', async () => {
  const res = createMockResponse();
  await listApiKeys({ user: undefined } as any, res as any);
  assert.equal(res.statusCode, 401);
});

// ── createApiKey ──

test('createApiKey succeeds within plan limit', async () => {
  const res = createMockResponse();
  prisma.apiKey.count = async () => 0;
  prisma.apiKey.create = async () => ({
    id: 'k1', name: 'test-key', keyPrefix: 'ilal_live',
    permissions: 'verify,session', rateLimit: 10,
    createdAt: new Date().toISOString(), expiresAt: null,
  } as any);

  await createApiKey(
    authedReq({ body: { name: 'test-key' } }),
    res as any,
  );
  assert.equal(res.statusCode, 201);
  assert.ok((res.body as any).apiKey);
  assert.ok((res.body as any).warning);
});

test('createApiKey rejects when plan limit reached', async () => {
  const res = createMockResponse();
  prisma.apiKey.count = async () => 2;

  await createApiKey(
    authedReq({ body: { name: 'another-key' } }),
    res as any,
  );
  assert.equal(res.statusCode, 403);
  assert.ok((res.body as any).message.includes('limit'));
});

test('createApiKey rejects unauthenticated', async () => {
  const res = createMockResponse();
  await createApiKey({ user: undefined, body: { name: 'x' } } as any, res as any);
  assert.equal(res.statusCode, 401);
});

test('createApiKey rejects invalid body (missing name)', async () => {
  const res = createMockResponse();
  await createApiKey(authedReq({ body: {} }), res as any);
  assert.equal(res.statusCode, 400);
});

// ── deleteApiKey ──

test('deleteApiKey succeeds when key belongs to user', async () => {
  const res = createMockResponse();
  prisma.apiKey.findFirst = async () => ({ id: 'k1', userId: 'u1' } as any);
  prisma.apiKey.update = async () => ({} as any);

  await deleteApiKey(
    authedReq({ params: { id: 'k1' } }),
    res as any,
  );
  assert.equal(res.statusCode, 200);
  assert.ok((res.body as any).message.includes('revoked'));
});

test('deleteApiKey returns 404 for non-existent key', async () => {
  const res = createMockResponse();
  prisma.apiKey.findFirst = async () => null;

  await deleteApiKey(
    authedReq({ params: { id: 'nonexistent' } }),
    res as any,
  );
  assert.equal(res.statusCode, 404);
});

test('deleteApiKey rejects unauthenticated', async () => {
  const res = createMockResponse();
  await deleteApiKey({ user: undefined, params: { id: 'k1' } } as any, res as any);
  assert.equal(res.statusCode, 401);
});

// ── updateApiKey ──

test('updateApiKey succeeds with valid data', async () => {
  const res = createMockResponse();
  prisma.apiKey.findFirst = async () => ({ id: 'k1', userId: 'u1' } as any);
  prisma.apiKey.update = async () => ({
    id: 'k1', name: 'renamed', keyPrefix: 'ilal_live',
    permissions: 'verify', rateLimit: 50, isActive: true,
    lastUsedAt: null, createdAt: new Date().toISOString(), expiresAt: null,
  } as any);

  await updateApiKey(
    authedReq({ params: { id: 'k1' }, body: { name: 'renamed', rateLimit: 50 } }),
    res as any,
  );
  assert.equal(res.statusCode, 200);
  assert.equal((res.body as any).apiKey.name, 'renamed');
});

test('updateApiKey returns 404 for non-existent key', async () => {
  const res = createMockResponse();
  prisma.apiKey.findFirst = async () => null;

  await updateApiKey(
    authedReq({ params: { id: 'gone' }, body: { name: 'x' } }),
    res as any,
  );
  assert.equal(res.statusCode, 404);
});

test('updateApiKey rejects invalid body', async () => {
  const res = createMockResponse();
  await updateApiKey(
    authedReq({ params: { id: 'k1' }, body: { rateLimit: -1 } }),
    res as any,
  );
  assert.equal(res.statusCode, 400);
});
