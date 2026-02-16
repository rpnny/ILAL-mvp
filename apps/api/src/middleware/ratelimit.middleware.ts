/**
 * 限流中间件
 */

import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';
import { RATE_LIMITS } from '../config/constants.js';
import type { Plan } from '@prisma/client';

/**
 * 动态限流中间件 - 根据用户套餐动态调整限流
 */
export const dynamicRateLimiter = rateLimit({
  windowMs: 60000, // 1分钟窗口
  max: (req: Request) => {
    // 如果有用户信息，根据套餐返回限制
    if (req.user?.plan) {
      const plan = req.user.plan as Plan;
      return RATE_LIMITS[plan]?.max || RATE_LIMITS.FREE.max;
    }

    // 默认使用免费套餐限制
    return RATE_LIMITS.FREE.max;
  },
  standardHeaders: true, // 返回标准的 RateLimit headers
  legacyHeaders: false, // 禁用 X-RateLimit-* headers
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please upgrade your plan or wait.',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
  keyGenerator: (req: Request) => {
    // 使用 API Key ID 或用户 ID 作为限流 key
    if (req.apiKey?.id) {
      return `apikey:${req.apiKey.id}`;
    }
    if (req.user?.userId) {
      return `user:${req.user.userId}`;
    }
    // fallback 到 IP
    return req.ip || 'unknown';
  },
});

/**
 * 为不同端点创建固定限流器
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 每15分钟最多5次登录尝试
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Too many authentication attempts. Please try again later.',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
});

/**
 * 注册限流器
 */
export const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 3, // 每小时最多3次注册
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Too many registration attempts. Please try again later.',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
});
