/**
 * 计费服务 - 使用追踪和配额管理
 */

import { prisma } from '../config/database.js';
import { RATE_LIMITS } from '../config/constants.js';
import { logger } from '../config/logger.js';
import type { Plan } from '@prisma/client';

class BillingService {
  /**
   * 记录 API 使用
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
      // 不抛出错误，避免影响主流程
    }
  }

  /**
   * 检查配额是否充足
   */
  async checkQuota(userId: string, plan: Plan): Promise<{
    allowed: boolean;
    remaining: number;
    limit: number;
    resetDate: Date;
  }> {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // 获取本月使用量
    const usageCount = await prisma.usageRecord.count({
      where: {
        userId,
        timestamp: {
          gte: firstDayOfMonth,
          lte: lastDayOfMonth,
        },
      },
    });

    const limit = RATE_LIMITS[plan].monthlyQuota;
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
   * 获取用户本月使用统计
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
      where: {
        userId,
        timestamp: {
          gte: firstDayOfMonth,
        },
      },
    });

    const totalCalls = records.length;
    const successfulCalls = records.filter(r => r.statusCode >= 200 && r.statusCode < 300).length;
    const failedCalls = totalCalls - successfulCalls;
    const totalCost = records.reduce((sum, r) => sum + r.cost, 0);

    const byEndpoint: Record<string, number> = {};
    records.forEach(r => {
      byEndpoint[r.endpoint] = (byEndpoint[r.endpoint] || 0) + 1;
    });

    return {
      totalCalls,
      successfulCalls,
      failedCalls,
      totalCost,
      byEndpoint,
    };
  }

  /**
   * 获取用户的当前套餐限制信息
   */
  getPlanLimits(plan: Plan): {
    monthlyQuota: number;
    rateLimit: number;
    rateLimitWindow: number;
  } {
    const limits = RATE_LIMITS[plan];
    return {
      monthlyQuota: limits.monthlyQuota,
      rateLimit: limits.max,
      rateLimitWindow: limits.windowMs,
    };
  }

  /**
   * 检查是否允许升级套餐
   */
  canUpgradePlan(currentPlan: Plan, targetPlan: Plan): boolean {
    const planOrder = { FREE: 0, PRO: 1, ENTERPRISE: 2 };
    return planOrder[targetPlan] > planOrder[currentPlan];
  }

  /**
   * 升级用户套餐
   */
  async upgradePlan(userId: string, newPlan: Plan): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new Error('User not found');
    }

    if (!this.canUpgradePlan(user.plan, newPlan)) {
      throw new Error('Invalid plan upgrade');
    }

    await prisma.$transaction([
      // 更新用户套餐
      prisma.user.update({
        where: { id: userId },
        data: { plan: newPlan },
      }),

      // 创建订阅记录
      prisma.subscription.create({
        data: {
          userId,
          plan: newPlan,
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);

    logger.info('User plan upgraded', { userId, newPlan });
  }

  /**
   * 获取用户活跃订阅
   */
  async getActiveSubscription(userId: string) {
    return await prisma.subscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        currentPeriodEnd: {
          gte: new Date(),
        },
      },
      orderBy: {
        currentPeriodStart: 'desc',
      },
    });
  }
}

export const billingService = new BillingService();
