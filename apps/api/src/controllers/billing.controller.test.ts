import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.API_KEY_SECRET = process.env.API_KEY_SECRET || 'test-api-key-secret';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./test.db';

const { getUsageStats, getPlans, upgradePlan, getInvoices } = await import('./billing.controller.ts');
const { billingService } = await import('../services/billing.service.js');
const { prisma } = await import('../config/database.js');

const origGetMonthlyStats = billingService.getMonthlyStats.bind(billingService);
const origCheckQuota = billingService.checkQuota.bind(billingService);
const origGetPlanLimits = billingService.getPlanLimits.bind(billingService);
const origCanUpgradePlan = billingService.canUpgradePlan.bind(billingService);
const origUpgradePlan = billingService.upgradePlan.bind(billingService);
const origUserFindUnique = prisma.user.findUnique.bind(prisma.user);
const origSubFindMany = prisma.subscription.findMany.bind(prisma.subscription);

afterEach(() => {
  billingService.getMonthlyStats = origGetMonthlyStats;
  billingService.checkQuota = origCheckQuota;
  billingService.getPlanLimits = origGetPlanLimits;
  billingService.canUpgradePlan = origCanUpgradePlan;
  billingService.upgradePlan = origUpgradePlan;
  prisma.user.findUnique = origUserFindUnique;
  prisma.subscription.findMany = origSubFindMany;
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

const authedReq = (extra?: object) => ({
  user: { userId: 'u1', email: 'a@b.com', plan: 'FREE' },
  ...extra,
} as any);

// ── getUsageStats ──

test('getUsageStats returns stats for authenticated user', async () => {
  const res = createMockResponse();

  billingService.getMonthlyStats = async () => ({
    totalCalls: 42, successfulCalls: 40, failedCalls: 2, totalCost: 50, byEndpoint: {},
  });
  billingService.checkQuota = async () => ({
    allowed: true, remaining: 958, limit: 1000, resetDate: new Date(),
  });
  billingService.getPlanLimits = () => ({
    monthlyQuota: 1000, rateLimit: 10, rateLimitWindow: 60000,
  });

  await getUsageStats(authedReq(), res as any);
  assert.equal(res.statusCode, 200);
  assert.equal((res.body as any).usage.totalCalls, 42);
  assert.ok((res.body as any).quota);
  assert.ok((res.body as any).plan);
});

test('getUsageStats rejects unauthenticated', async () => {
  const res = createMockResponse();
  await getUsageStats({ user: undefined } as any, res as any);
  assert.equal(res.statusCode, 401);
});

// ── getPlans ──

test('getPlans returns all plan tiers', async () => {
  const res = createMockResponse();
  await getPlans({} as any, res as any);
  assert.equal(res.statusCode, 200);
  const plans = (res.body as any).plans;
  assert.equal(plans.length, 3);
  assert.equal(plans[0].id, 'FREE');
  assert.equal(plans[1].id, 'PRO');
  assert.equal(plans[2].id, 'ENTERPRISE');
});

// ── upgradePlan ──

test('upgradePlan succeeds for valid upgrade', async () => {
  const res = createMockResponse();
  prisma.user.findUnique = async () => ({ id: 'u1', plan: 'FREE' } as any);
  billingService.canUpgradePlan = () => true;
  billingService.upgradePlan = async () => {};

  await upgradePlan(
    authedReq({ body: { targetPlan: 'PRO' } }),
    res as any,
  );
  assert.equal(res.statusCode, 200);
  assert.equal((res.body as any).newPlan, 'PRO');
});

test('upgradePlan rejects downgrade', async () => {
  const res = createMockResponse();
  prisma.user.findUnique = async () => ({ id: 'u1', plan: 'PRO' } as any);
  billingService.canUpgradePlan = () => false;

  await upgradePlan(
    authedReq({ body: { targetPlan: 'FREE' } }),
    res as any,
  );
  assert.equal(res.statusCode, 400);
});

test('upgradePlan rejects unauthenticated', async () => {
  const res = createMockResponse();
  await upgradePlan({ user: undefined, body: { targetPlan: 'PRO' } } as any, res as any);
  assert.equal(res.statusCode, 401);
});

test('upgradePlan rejects invalid plan name', async () => {
  const res = createMockResponse();
  await upgradePlan(authedReq({ body: { targetPlan: 'INVALID' } }), res as any);
  assert.equal(res.statusCode, 400);
});

// ── getInvoices ──

test('getInvoices returns subscription history', async () => {
  const res = createMockResponse();
  prisma.subscription.findMany = async () => [
    { id: 's1', plan: 'PRO', status: 'ACTIVE' },
  ] as any;

  await getInvoices(authedReq(), res as any);
  assert.equal(res.statusCode, 200);
  assert.equal((res.body as any).subscriptions.length, 1);
});

test('getInvoices rejects unauthenticated', async () => {
  const res = createMockResponse();
  await getInvoices({ user: undefined } as any, res as any);
  assert.equal(res.statusCode, 401);
});
