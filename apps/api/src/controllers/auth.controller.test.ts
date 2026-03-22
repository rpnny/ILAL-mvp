import assert from 'node:assert/strict';
import test, { afterEach, mock } from 'node:test';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';
process.env.API_KEY_SECRET = process.env.API_KEY_SECRET || 'test-api-key-secret';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./test.db';

const authModule = await import('./auth.controller.ts');
const databaseModule = await import('../config/database.js');
const passwordModule = await import('../utils/password.js');
const jwtModule = await import('../utils/jwt.js');

const { register, login, refresh, getMe } = authModule;
const { prisma } = databaseModule;

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

const origUserFindUnique = prisma.user.findUnique.bind(prisma.user);
const origUserCreate = prisma.user.create.bind(prisma.user);

afterEach(() => {
  prisma.user.findUnique = origUserFindUnique;
  prisma.user.create = origUserCreate;
});

// ── register ──

test('register succeeds with valid input', async () => {
  const res = createMockResponse();
  prisma.user.findUnique = async () => null;
  prisma.user.create = async ({ data, select }: any) => ({
    id: 'u1', email: data.email, name: data.name,
    walletAddress: data.walletAddress, plan: 'FREE',
    emailVerified: false, createdAt: new Date().toISOString(),
  } as any);

  await register(
    { body: { email: 'a@b.com', password: 'Abcd1234', name: 'Test' } } as any,
    res as any,
  );

  assert.equal(res.statusCode, 201);
  assert.ok((res.body as any).accessToken);
  assert.ok((res.body as any).refreshToken);
});

test('register rejects weak password', async () => {
  const res = createMockResponse();
  await register(
    { body: { email: 'a@b.com', password: 'short' } } as any,
    res as any,
  );
  assert.equal(res.statusCode, 400);
});

test('register rejects duplicate email', async () => {
  const res = createMockResponse();
  prisma.user.findUnique = async ({ where }: any) => {
    if (where.email) return { id: 'u1' } as any;
    return null;
  };

  await register(
    { body: { email: 'dup@b.com', password: 'Abcd1234' } } as any,
    res as any,
  );
  assert.equal(res.statusCode, 409);
  assert.ok((res.body as any).message.includes('Email'));
});

test('register rejects duplicate wallet', async () => {
  const res = createMockResponse();
  let callIndex = 0;
  prisma.user.findUnique = async ({ where }: any) => {
    if (where.email) return null;
    if (where.walletAddress) return { id: 'u2' } as any;
    return null;
  };

  await register(
    { body: { email: 'new@b.com', password: 'Abcd1234', walletAddress: '0x' + '1'.repeat(40) } } as any,
    res as any,
  );
  assert.equal(res.statusCode, 409);
  assert.ok((res.body as any).message.includes('Wallet'));
});

test('register rejects invalid email (zod)', async () => {
  const res = createMockResponse();
  await register(
    { body: { email: 'not-an-email', password: 'Abcd1234' } } as any,
    res as any,
  );
  assert.equal(res.statusCode, 400);
});

// ── login ──

test('login succeeds with correct credentials', async () => {
  const res = createMockResponse();
  const hash = await passwordModule.hashPassword('Abcd1234');
  prisma.user.findUnique = async () => ({
    id: 'u1', email: 'a@b.com', passwordHash: hash,
    name: 'T', walletAddress: null, plan: 'FREE', emailVerified: false,
  } as any);

  await login({ body: { email: 'a@b.com', password: 'Abcd1234' } } as any, res as any);
  assert.equal(res.statusCode, 200);
  assert.ok((res.body as any).accessToken);
});

test('login rejects wrong password', async () => {
  const res = createMockResponse();
  const hash = await passwordModule.hashPassword('Abcd1234');
  prisma.user.findUnique = async () => ({
    id: 'u1', email: 'a@b.com', passwordHash: hash,
    name: 'T', walletAddress: null, plan: 'FREE', emailVerified: false,
  } as any);

  await login({ body: { email: 'a@b.com', password: 'WrongPass1' } } as any, res as any);
  assert.equal(res.statusCode, 401);
});

test('login rejects unknown email', async () => {
  const res = createMockResponse();
  prisma.user.findUnique = async () => null;

  await login({ body: { email: 'nobody@x.com', password: 'Abcd1234' } } as any, res as any);
  assert.equal(res.statusCode, 401);
});

test('login rejects invalid body (zod)', async () => {
  const res = createMockResponse();
  await login({ body: { email: 'bad', password: '' } } as any, res as any);
  assert.equal(res.statusCode, 400);
});

// ── refresh ──

test('refresh returns new access token', async () => {
  const res = createMockResponse();
  const rt = jwtModule.generateRefreshToken({ userId: 'u1', email: 'a@b.com', plan: 'FREE' });
  prisma.user.findUnique = async () => ({ id: 'u1', email: 'a@b.com', plan: 'FREE' } as any);

  await refresh({ body: { refreshToken: rt } } as any, res as any);
  assert.equal(res.statusCode, 200);
  assert.ok((res.body as any).accessToken);
});

test('refresh rejects invalid token', async () => {
  const res = createMockResponse();
  await refresh({ body: { refreshToken: 'invalid.token.here' } } as any, res as any);
  assert.equal(res.statusCode, 401);
});

test('refresh rejects missing body', async () => {
  const res = createMockResponse();
  await refresh({ body: {} } as any, res as any);
  assert.equal(res.statusCode, 400);
});

// ── getMe ──

test('getMe returns user info when authenticated', async () => {
  const res = createMockResponse();
  prisma.user.findUnique = async () => ({
    id: 'u1', email: 'a@b.com', name: 'T', walletAddress: null,
    plan: 'FREE', emailVerified: false,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  } as any);

  await getMe({ user: { userId: 'u1', email: 'a@b.com', plan: 'FREE' } } as any, res as any);
  assert.equal(res.statusCode, 200);
  assert.equal((res.body as any).user.id, 'u1');
});

test('getMe rejects unauthenticated request', async () => {
  const res = createMockResponse();
  await getMe({ user: undefined } as any, res as any);
  assert.equal(res.statusCode, 401);
});

test('getMe returns 404 for deleted user', async () => {
  const res = createMockResponse();
  prisma.user.findUnique = async () => null;
  await getMe({ user: { userId: 'gone', email: 'x@y.com', plan: 'FREE' } } as any, res as any);
  assert.equal(res.statusCode, 404);
});
