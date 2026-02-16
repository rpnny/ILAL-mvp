/**
 * 使用追踪中间件
 */

import type { Request, Response, NextFunction } from 'express';
import { billingService } from '../services/billing.service.js';
import { logger } from '../config/logger.js';

/**
 * 使用追踪中间件
 * 记录每个 API 调用到数据库
 */
export function usageTrackingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now();

  // 保存原始的 res.json 方法
  const originalJson = res.json.bind(res);

  // 重写 res.json 方法以捕获响应
  res.json = function (body: any) {
    const responseTime = Date.now() - startTime;

    // 异步记录使用情况（不阻塞响应）
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

    // 调用原始的 json 方法
    return originalJson(body);
  };

  next();
}

/**
 * 计算请求成本（不同端点权重不同）
 */
function calculateCost(path: string, method: string): number {
  // ZK 验证成本较高
  if (path.includes('/verify') && method === 'POST') {
    return 5.0;
  }

  // Session 激活成本中等
  if (path.includes('/session') && method === 'POST') {
    return 3.0;
  }

  // 查询类请求成本较低
  if (method === 'GET') {
    return 0.5;
  }

  // 默认成本
  return 1.0;
}

/**
 * 配额检查中间件
 * 在处理请求前检查用户配额
 */
export async function quotaCheckMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      // 没有用户信息，跳过配额检查
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

    // 将配额信息附加到响应头
    res.setHeader('X-Quota-Remaining', quota.remaining.toString());
    res.setHeader('X-Quota-Limit', quota.limit.toString());
    res.setHeader('X-Quota-Reset', quota.resetDate.toISOString());

    next();
  } catch (error: any) {
    logger.error('Quota check failed', { error: error.message });
    // 配额检查失败不阻塞请求
    next();
  }
}
