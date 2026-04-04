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
    const plan = (req.user?.plan as string) || 'FREE';
    const planMax = RATE_LIMITS[plan as keyof typeof RATE_LIMITS]?.max ?? RATE_LIMITS.FREE.max;
    // If the API key has a custom rateLimit set, use whichever is higher
    const keyMax = req.apiKey?.rateLimit ?? 0;
    return Math.max(planMax, keyMax);
  },
  standardHeaders: true, // Return standard RateLimit headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  handler: (req: Request, res: Response) => {
    const plan = (req.user?.plan as string) || 'FREE';
    const limit = RATE_LIMITS[plan as keyof typeof RATE_LIMITS]?.max || RATE_LIMITS.FREE.max;
    res.status(429).json({
      error: 'Too Many Requests',
      code: 'RATE_LIMIT_EXCEEDED',
      message: `Rate limit exceeded (${limit} requests/min on ${plan} plan). Please wait or upgrade.`,
      hint: 'Space requests ≥1s apart, or use ?buildOnly=true to skip simulation for lower latency.',
      retryAfter: res.getHeader('Retry-After'),
      plan,
      limit,
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
 * Pre-auth rate limiter for expensive API-key protected endpoints.
 * Runs before bcrypt/API-key verification so unauthenticated floods are
 * throttled cheaply by IP instead of consuming CPU first.
 */
export const preAuthVerifyRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 60 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.ip || 'unknown',
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Too many verification attempts. Please try again later.',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
});

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
