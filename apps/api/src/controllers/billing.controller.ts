/**
 * 计费控制器 - 使用统计、套餐管理
 */

import type { Request, Response } from 'express';
import { z } from 'zod';
import { billingService } from '../services/billing.service.js';
import { prisma } from '../config/database.js';
import { PLAN_PRICING, RATE_LIMITS } from '../config/constants.js';
import { logger } from '../config/logger.js';
import type { Plan } from '@prisma/client';

/**
 * 获取使用统计
 * GET /api/v1/usage/stats
 */
export async function getUsageStats(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const stats = await billingService.getMonthlyStats(req.user.userId);
    const quota = await billingService.checkQuota(req.user.userId, req.user.plan as Plan);
    const planLimits = billingService.getPlanLimits(req.user.plan as Plan);

    res.json({
      usage: stats,
      quota: {
        limit: quota.limit,
        remaining: quota.remaining,
        resetDate: quota.resetDate,
      },
      plan: {
        current: req.user.plan,
        limits: planLimits,
      },
    });
  } catch (error: any) {
    logger.error('Get usage stats failed', { error: error.message });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve usage statistics',
    });
  }
}

/**
 * 获取可用套餐列表
 * GET /api/v1/billing/plans
 */
export async function getPlans(req: Request, res: Response): Promise<void> {
  try {
    const plans = [
      {
        id: 'FREE',
        name: '免费版',
        price: PLAN_PRICING.FREE,
        currency: 'USD',
        interval: 'month',
        features: {
          monthlyQuota: RATE_LIMITS.FREE.monthlyQuota,
          rateLimit: RATE_LIMITS.FREE.max,
          support: '社区',
        },
      },
      {
        id: 'PRO',
        name: '专业版',
        price: PLAN_PRICING.PRO,
        currency: 'USD',
        interval: 'month',
        features: {
          monthlyQuota: RATE_LIMITS.PRO.monthlyQuota,
          rateLimit: RATE_LIMITS.PRO.max,
          support: 'Email',
        },
      },
      {
        id: 'ENTERPRISE',
        name: '企业版',
        price: PLAN_PRICING.ENTERPRISE,
        currency: 'USD',
        interval: 'month',
        features: {
          monthlyQuota: '无限制',
          rateLimit: RATE_LIMITS.ENTERPRISE.max,
          support: '专属',
          customization: true,
        },
      },
    ];

    res.json({ plans });
  } catch (error: any) {
    logger.error('Get plans failed', { error: error.message });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve plans',
    });
  }
}

/**
 * 升级套餐
 * POST /api/v1/billing/upgrade
 */
export async function upgradePlan(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const upgradeSchema = z.object({
      targetPlan: z.enum(['FREE', 'PRO', 'ENTERPRISE']),
    });

    const body = upgradeSchema.parse(req.body);

    // 检查是否允许升级
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user) {
      res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
      });
      return;
    }

    if (!billingService.canUpgradePlan(user.plan, body.targetPlan as Plan)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Cannot downgrade or same plan',
      });
      return;
    }

    // 执行升级
    await billingService.upgradePlan(req.user.userId, body.targetPlan as Plan);

    logger.info('Plan upgraded', {
      userId: req.user.userId,
      from: user.plan,
      to: body.targetPlan,
    });

    res.json({
      message: 'Plan upgraded successfully',
      newPlan: body.targetPlan,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid request data',
        details: error.errors,
      });
      return;
    }

    logger.error('Upgrade plan failed', { error: error.message });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to upgrade plan',
    });
  }
}

/**
 * 获取账单历史
 * GET /api/v1/billing/invoices
 */
export async function getInvoices(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const subscriptions = await prisma.subscription.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      take: 12, // 最近12个月
    });

    res.json({ subscriptions });
  } catch (error: any) {
    logger.error('Get invoices failed', { error: error.message });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve invoices',
    });
  }
}
