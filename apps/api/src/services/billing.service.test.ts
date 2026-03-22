import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.API_KEY_SECRET = process.env.API_KEY_SECRET || 'test-api-key-secret';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./test.db';

const { billingService } = await import('./billing.service.ts');
const { prisma } = await import('../config/database.js');

const origUsageCreate = prisma.usageRecord.create.bind(prisma.usageRecord);
const origUsageCount = prisma.usageRecord.count.bind(prisma.usageRecord);
const origUsageFindMany = prisma.usageRecord.findMany.bind(prisma.usageRecord);
const origUserFindUnique = prisma.user.findUnique.bind(prisma.user);
const origUserUpdate = prisma.user.update.bind(prisma.user);
const origSubCreate = prisma.subscription.create.bind(prisma.subscription);
const origTransaction = prisma.$transaction.bind(prisma);

afterEach(() => {
  prisma.usageRecord.create = origUsageCreate;
  prisma.usageRecord.count = origUsageCount;
  prisma.usageRecord.findMany = origUsageFindMany;
  prisma.user.findUnique = origUserFindUnique;
  prisma.user.update = origUserUpdate;
  prisma.subscription.create = origSubCreate;
  prisma.$transaction = origTransaction;
});

// ── checkQuota ──

test('checkQuota allows requests within limit', async () => {
  prisma.usageRecord.count = async () => 100;

  const result = await billingService.checkQuota('u1', 'FREE');
  assert.equal(result.allowed, true);
  assert.equal(result.remaining, 900);
  assert.equal(result.limit, 1000);
});

test('checkQuota blocks when quota exceeded', async () => {
  prisma.usageRecord.count = async () => 1001;

  const result = await billingService.checkQuota('u1', 'FREE');
  assert.equal(result.allowed, false);
  assert.equal(result.remaining, 0);
});

test('checkQuota always allows ENTERPRISE (Infinity)', async () => {
  prisma.usageRecord.count = async () => 999999;

  const result = await billingService.checkQuota('u1', 'ENTERPRISE');
  assert.equal(result.allowed, true);
});

// ── getMonthlyStats ──

test('getMonthlyStats calculates correct totals', async () => {
  prisma.usageRecord.findMany = async () => [
    { statusCode: 200, cost: 1.0, endpoint: '/verify' },
    { statusCode: 200, cost: 5.0, endpoint: '/verify' },
    { statusCode: 500, cost: 1.0, endpoint: '/session' },
  ] as any;

  const stats = await billingService.getMonthlyStats('u1');
  assert.equal(stats.totalCalls, 3);
  assert.equal(stats.successfulCalls, 2);
  assert.equal(stats.failedCalls, 1);
  assert.equal(stats.totalCost, 7.0);
  assert.equal(stats.byEndpoint['/verify'], 2);
  assert.equal(stats.byEndpoint['/session'], 1);
});

// ── getPlanLimits ──

test('getPlanLimits returns correct limits for each plan', () => {
  const free = billingService.getPlanLimits('FREE');
  assert.equal(free.monthlyQuota, 1000);

  const pro = billingService.getPlanLimits('PRO');
  assert.equal(pro.monthlyQuota, 50000);

  const enterprise = billingService.getPlanLimits('ENTERPRISE');
  assert.equal(enterprise.monthlyQuota, Infinity);
});

test('getPlanLimits defaults to FREE for unknown plan', () => {
  const result = billingService.getPlanLimits('UNKNOWN');
  assert.equal(result.monthlyQuota, 1000);
});

// ── canUpgradePlan ──

test('canUpgradePlan allows valid upgrades', () => {
  assert.equal(billingService.canUpgradePlan('FREE', 'PRO'), true);
  assert.equal(billingService.canUpgradePlan('FREE', 'ENTERPRISE'), true);
  assert.equal(billingService.canUpgradePlan('PRO', 'ENTERPRISE'), true);
});

test('canUpgradePlan rejects downgrades and same plan', () => {
  assert.equal(billingService.canUpgradePlan('PRO', 'FREE'), false);
  assert.equal(billingService.canUpgradePlan('FREE', 'FREE'), false);
  assert.equal(billingService.canUpgradePlan('ENTERPRISE', 'PRO'), false);
});

// ── upgradePlan ──

test('upgradePlan executes transaction', async () => {
  let transactionCalled = false;
  prisma.user.findUnique = async () => ({ id: 'u1', plan: 'FREE' } as any);
  prisma.$transaction = async (ops: any) => {
    transactionCalled = true;
    return ops;
  };

  await billingService.upgradePlan('u1', 'PRO');
  assert.equal(transactionCalled, true);
});

test('upgradePlan rejects user not found', async () => {
  prisma.user.findUnique = async () => null;

  await assert.rejects(
    () => billingService.upgradePlan('gone', 'PRO'),
    /User not found/,
  );
});

test('upgradePlan rejects invalid upgrade direction', async () => {
  prisma.user.findUnique = async () => ({ id: 'u1', plan: 'PRO' } as any);

  await assert.rejects(
    () => billingService.upgradePlan('u1', 'FREE'),
    /Invalid plan upgrade/,
  );
});
