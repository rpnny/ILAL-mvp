import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.API_KEY_SECRET = process.env.API_KEY_SECRET || 'test-api-key-secret';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./test.db';

const { usageTrackingMiddleware, quotaCheckMiddleware } = await import('./usage.middleware.ts');
const { billingService } = await import('../services/billing.service.js');

const origRecordUsage = billingService.recordUsage.bind(billingService);
const origCheckQuota = billingService.checkQuota.bind(billingService);

afterEach(() => {
  billingService.recordUsage = origRecordUsage;
  billingService.checkQuota = origCheckQuota;
});

type MockResponse = {
  statusCode: number;
  body: unknown;
  headers: Record<string, string>;
  status: (code: number) => MockResponse;
  json: (payload: unknown) => MockResponse;
  setHeader: (key: string, value: string) => void;
  getHeader: (key: string) => string | undefined;
};

function createMockResponse(): MockResponse {
  const resp: MockResponse = {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code: number) { this.statusCode = code; return this; },
    json(payload: unknown) { this.body = payload; return this; },
    setHeader(key: string, value: string) { this.headers[key] = value; },
    getHeader(key: string) { return this.headers[key]; },
  };
  return resp;
}

// ── usageTrackingMiddleware ──

test('usageTrackingMiddleware calls next immediately', () => {
  let nextCalled = false;
  const req = { user: { userId: 'u1' }, apiKey: { id: 'k1' }, path: '/test', method: 'GET' } as any;
  const res = createMockResponse();

  usageTrackingMiddleware(req, res as any, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});

test('usageTrackingMiddleware records usage on json response', async () => {
  let recorded = false;
  billingService.recordUsage = async () => { recorded = true; };

  const req = { user: { userId: 'u1' }, apiKey: { id: 'k1' }, path: '/verify', method: 'POST' } as any;
  const res = createMockResponse();

  usageTrackingMiddleware(req, res as any, () => {});
  res.json({ ok: true });

  await new Promise(r => setTimeout(r, 50));
  assert.equal(recorded, true);
});

test('usageTrackingMiddleware skips recording without user/apiKey', () => {
  let recorded = false;
  billingService.recordUsage = async () => { recorded = true; };

  const req = { path: '/public', method: 'GET' } as any;
  const res = createMockResponse();

  usageTrackingMiddleware(req, res as any, () => {});
  res.json({ ok: true });

  assert.equal(recorded, false);
});

// ── quotaCheckMiddleware ──

test('quotaCheckMiddleware passes when quota available', async () => {
  let nextCalled = false;
  billingService.checkQuota = async () => ({
    allowed: true, remaining: 500, limit: 1000, resetDate: new Date(),
  });

  const req = { user: { userId: 'u1', plan: 'FREE' } } as any;
  const res = createMockResponse();

  await quotaCheckMiddleware(req, res as any, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.ok(res.headers['X-Quota-Remaining']);
  assert.ok(res.headers['X-Quota-Limit']);
});

test('quotaCheckMiddleware blocks when quota exceeded', async () => {
  let nextCalled = false;
  billingService.checkQuota = async () => ({
    allowed: false, remaining: 0, limit: 1000, resetDate: new Date(),
  });

  const req = { user: { userId: 'u1', plan: 'FREE' } } as any;
  const res = createMockResponse();

  await quotaCheckMiddleware(req, res as any, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 402);
});

test('quotaCheckMiddleware skips when no user present', async () => {
  let nextCalled = false;
  const req = {} as any;
  const res = createMockResponse();

  await quotaCheckMiddleware(req, res as any, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});

test('quotaCheckMiddleware passes on error (fail-open)', async () => {
  let nextCalled = false;
  billingService.checkQuota = async () => { throw new Error('DB down'); };

  const req = { user: { userId: 'u1', plan: 'FREE' } } as any;
  const res = createMockResponse();

  await quotaCheckMiddleware(req, res as any, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});
