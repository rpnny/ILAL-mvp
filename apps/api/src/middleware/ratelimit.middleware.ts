/**
 * Rate Limiting Middleware
 */

import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';
import { RATE_LIMITS } from '../config/constants.js';
// Plan is a string: 'FREE' | 'PRO' | 'ENTERPRISE'

/**
 * Dynamic rate limiter - adjusts rate limits based on user plan
 */
export const dynamicRateLimiter = rateLimit({
  windowMs: 60000, // 1 minute window
  max: (req: Request) => {
    // If user info is present, return plan-based limit
    if (req.user?.plan) {
      const plan = req.user.plan as string;
      return RATE_LIMITS[plan as keyof typeof RATE_LIMITS]?.max || RATE_LIMITS.FREE.max;
    }

    // Default to free plan limit
    return RATE_LIMITS.FREE.max;
  },
  standardHeaders: true, // Return standard RateLimit headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please upgrade your plan or wait.',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
  keyGenerator: (req: Request) => {
    // Use API Key ID or user ID as rate limit key
    if (req.apiKey?.id) {
      return `apikey:${req.apiKey.id}`;
    }
    if (req.user?.userId) {
      return `user:${req.user.userId}`;
    }
    // Fallback to IP
    return req.ip || 'unknown';
  },
});

const isDev = process.env.NODE_ENV === 'development' && process.env.RATE_LIMIT_DEV_OVERRIDE === 'true';

/**
 * Fixed rate limiter for specific endpoints.
 * Dev mode relaxation requires explicit RATE_LIMIT_DEV_OVERRIDE=true.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 50 : 5,
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
 * Registration rate limiter
 */
export const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDev ? 20 : 3,
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
