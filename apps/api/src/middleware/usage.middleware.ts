/**
 * Usage Tracking Middleware
 */

import type { Request, Response, NextFunction } from 'express';
import { billingService } from '../services/billing.service.js';
import { logger } from '../config/logger.js';

/**
 * Usage tracking middleware
 * Records each API call to the database
 */
export function usageTrackingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now();

  // Save original res.json method
  const originalJson = res.json.bind(res);

  // Override res.json to capture response
  res.json = function (body: any) {
    const responseTime = Date.now() - startTime;

    // Record usage asynchronously (non-blocking)
    if (req.user && req.apiKey) {
      billingService.recordUsage({
        userId: req.user.userId,
        apiKeyId: req.apiKey.id,
        endpoint: req.path,
        method: req.method,
        statusCode: res.statusCode,
        responseTime,
        cost: calculateCost(req.path, req.method),
      }).catch(err => {
        logger.error('Failed to record usage', { error: err.message });
      });
    }

    // Call original json method
    return originalJson(body);
  };

  next();
}

/**
 * Calculate request cost (different endpoint weights)
 */
function calculateCost(path: string, method: string): number {
  // ZK verification has higher cost
  if (path.includes('/verify') && method === 'POST') {
    return 5.0;
  }

  // Session activation has medium cost
  if (path.includes('/session') && method === 'POST') {
    return 3.0;
  }

  // Query requests have lower cost
  if (method === 'GET') {
    return 0.5;
  }

  // Default cost
  return 1.0;
}

/**
 * Quota check middleware
 * Checks user quota before processing request
 */
export async function quotaCheckMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      // No user info, skip quota check
      next();
      return;
    }

    const quota = await billingService.checkQuota(
      req.user.userId,
      req.user.plan as any
    );

    if (!quota.allowed) {
      res.status(402).json({
        error: 'Payment Required',
        message: 'Monthly quota exceeded. Please upgrade your plan.',
        quota: {
          limit: quota.limit,
          remaining: quota.remaining,
          resetDate: quota.resetDate,
        },
      });
      return;
    }

    // Attach quota info to response headers
    res.setHeader('X-Quota-Remaining', quota.remaining.toString());
    res.setHeader('X-Quota-Limit', quota.limit.toString());
    res.setHeader('X-Quota-Reset', quota.resetDate.toISOString());

    next();
  } catch (error: any) {
    logger.error('Quota check failed', { error: error.message });
    // Quota check failure should not block request
    next();
  }
}
