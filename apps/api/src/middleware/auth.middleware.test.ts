import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';
process.env.API_KEY_SECRET = process.env.API_KEY_SECRET || 'test-api-key-secret';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./test.db';

const { authMiddleware } = await import('./auth.middleware.ts');
const { prisma } = await import('../config/database.js');
const { generateAccessToken } = await import('../utils/jwt.js');

const origUserFindUnique = prisma.user.findUnique.bind(prisma.user);

afterEach(() => {
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

test('authMiddleware passes with valid token', async () => {
  const token = generateAccessToken({ userId: 'u1', email: 'a@b.com', plan: 'FREE' });
  const req = { headers: { authorization: `Bearer ${token}` } } as any;
  const res = createMockResponse();
  let nextCalled = false;

  prisma.user.findUnique = async () => ({ id: 'u1', email: 'a@b.com', plan: 'FREE' } as any);

  await authMiddleware(req, res as any, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(req.user.userId, 'u1');
});

test('authMiddleware rejects missing Authorization header', async () => {
  const req = { headers: {} } as any;
  const res = createMockResponse();
  let nextCalled = false;

  await authMiddleware(req, res as any, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.ok((res.body as any).message.includes('Missing'));
});

test('authMiddleware rejects malformed Authorization header', async () => {
  const req = { headers: { authorization: 'Basic abc123' } } as any;
  const res = createMockResponse();
  let nextCalled = false;

  await authMiddleware(req, res as any, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
});

test('authMiddleware rejects invalid token', async () => {
  const req = { headers: { authorization: 'Bearer invalid.jwt.token' } } as any;
  const res = createMockResponse();
  let nextCalled = false;

  await authMiddleware(req, res as any, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
});

test('authMiddleware rejects when user not found in DB', async () => {
  const token = generateAccessToken({ userId: 'gone', email: 'gone@x.com', plan: 'FREE' });
  const req = { headers: { authorization: `Bearer ${token}` } } as any;
  const res = createMockResponse();
  let nextCalled = false;

  prisma.user.findUnique = async () => null;

  await authMiddleware(req, res as any, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.ok((res.body as any).message.includes('User not found'));
});
