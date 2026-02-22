/**
 * Billing Controller - Usage statistics and plan management
 */

import type { Request, Response } from 'express';
import { z } from 'zod';
import { billingService } from '../services/billing.service.js';
import { prisma } from '../config/database.js';
import { PLAN_PRICING, RATE_LIMITS } from '../config/constants.js';
import { logger } from '../config/logger.js';

/**
 * Get usage statistics
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
    const quota = await billingService.checkQuota(req.user.userId, req.user.plan);
    const planLimits = billingService.getPlanLimits(req.user.plan);

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
 * Get available plans
 * GET /api/v1/billing/plans
 */
export async function getPlans(req: Request, res: Response): Promise<void> {
  try {
    const plans = [
      {
        id: 'FREE',
        name: 'Free',
        price: PLAN_PRICING.FREE,
        currency: 'USD',
        interval: 'month',
        features: {
          monthlyQuota: RATE_LIMITS.FREE.monthlyQuota,
          rateLimit: RATE_LIMITS.FREE.max,
          support: 'Community',
        },
      },
      {
        id: 'PRO',
        name: 'Pro',
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
        name: 'Enterprise',
        price: PLAN_PRICING.ENTERPRISE,
        currency: 'USD',
        interval: 'month',
        features: {
          monthlyQuota: 'Unlimited',
          rateLimit: RATE_LIMITS.ENTERPRISE.max,
          support: 'Dedicated',
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
 * Upgrade plan
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

    // Check if upgrade is allowed
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

    if (!billingService.canUpgradePlan(user.plan, body.targetPlan)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Cannot downgrade or same plan',
      });
      return;
    }

    // Perform upgrade
    await billingService.upgradePlan(req.user.userId, body.targetPlan);

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
 * Get billing history
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
      take: 12, // Last 12 months
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
