/**
 * Billing Service - Usage recording, quota management, plan upgrades
 */

import { prisma } from '../config/database.js';
import { RATE_LIMITS } from '../config/constants.js';
import { logger } from '../config/logger.js';

type Plan = 'FREE' | 'PRO' | 'ENTERPRISE';

class BillingService {
  /**
   * Record API usage
   */
  async recordUsage(params: {
    userId: string;
    apiKeyId: string;
    endpoint: string;
    method: string;
    statusCode: number;
    responseTime?: number;
    cost?: number;
  }): Promise<void> {
    try {
      await prisma.usageRecord.create({
        data: {
          userId: params.userId,
          apiKeyId: params.apiKeyId,
          endpoint: params.endpoint,
          method: params.method,
          statusCode: params.statusCode,
          responseTime: params.responseTime,
          cost: params.cost || 1.0,
        },
      });

      logger.debug('Usage recorded', {
        userId: params.userId,
        endpoint: params.endpoint,
      });
    } catch (error: any) {
      logger.error('Failed to record usage', { error: error.message });
    }
  }

  /**
   * Check user quota
   */
  async checkQuota(userId: string, plan: string): Promise<{
    allowed: boolean;
    remaining: number;
    limit: number;
    resetDate: Date;
  }> {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const usageCount = await prisma.usageRecord.count({
      where: {
        userId,
        timestamp: { gte: firstDayOfMonth, lte: lastDayOfMonth },
      },
    });

    const rateLimits = RATE_LIMITS[(plan as Plan) in RATE_LIMITS ? (plan as Plan) : 'FREE'];
    const limit = rateLimits.monthlyQuota;
    const remaining = Math.max(0, limit - usageCount);
    const allowed = remaining > 0 || limit === Infinity;

    return {
      allowed,
      remaining,
      limit,
      resetDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    };
  }

  /**
   * Get usage statistics for current month
   */
  async getMonthlyStats(userId: string): Promise<{
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    totalCost: number;
    byEndpoint: Record<string, number>;
  }> {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const records = await prisma.usageRecord.findMany({
      where: { userId, timestamp: { gte: firstDayOfMonth } },
    });

    const totalCalls = records.length;
    const successfulCalls = records.filter((r: any) => r.statusCode >= 200 && r.statusCode < 300).length;
    const failedCalls = totalCalls - successfulCalls;
    const totalCost = records.reduce((sum: number, r: any) => sum + r.cost, 0);

    const byEndpoint: Record<string, number> = {};
    records.forEach((r: any) => { byEndpoint[r.endpoint] = (byEndpoint[r.endpoint] || 0) + 1; });

    return { totalCalls, successfulCalls, failedCalls, totalCost, byEndpoint };
  }

  /**
   * Get current plan limit info
   */
  getPlanLimits(plan: string): {
    monthlyQuota: number;
    rateLimit: number;
    rateLimitWindow: number;
  } {
    const limits = RATE_LIMITS[(plan as Plan) in RATE_LIMITS ? (plan as Plan) : 'FREE'];
    return {
      monthlyQuota: limits.monthlyQuota,
      rateLimit: limits.max,
      rateLimitWindow: limits.windowMs,
    };
  }

  /**
   * Check if plan upgrade is allowed
   */
  canUpgradePlan(currentPlan: string, targetPlan: string): boolean {
    const planOrder: Record<string, number> = { FREE: 0, PRO: 1, ENTERPRISE: 2 };
    return (planOrder[targetPlan] ?? -1) > (planOrder[currentPlan] ?? -1);
  }

  /**
   * Upgrade user plan
   */
  async upgradePlan(userId: string, newPlan: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) throw new Error('User not found');
    if (!this.canUpgradePlan(user.plan, newPlan)) throw new Error('Invalid plan upgrade');

    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { plan: newPlan },
      }),
      prisma.subscription.create({
        data: {
          userId,
          plan: newPlan,
          status: 'ACTIVE',
          currentPeriodStart: now.toISOString(),
          currentPeriodEnd: periodEnd.toISOString(),
        },
      }),
    ]);

    logger.info('User plan upgraded', { userId, newPlan });
  }

  /**
   * Get user's active subscription
   */
  async getActiveSubscription(userId: string) {
    const now = new Date().toISOString();
    return await prisma.subscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        currentPeriodEnd: { gte: now },
      },
      orderBy: { currentPeriodStart: 'desc' },
    });
  }
}

export const billingService = new BillingService();
