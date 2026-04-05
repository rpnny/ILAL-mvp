/**
 * Rate Limiting Middleware
 */

import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';
import { RATE_LIMITS } from '../config/constants.js';
import { getRedisStore } from '../config/redis.js';

// Resolve store once at module load — Redis if available, else in-memory
const store = getRedisStore();

/**
 * Dynamic rate limiter - adjusts rate limits based on user plan
 */
export const dynamicRateLimiter = rateLimit({
  ...(store && { store }),
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
      retryable: true,
      plan,
      limit,
      requestId: req.requestId,
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
  ...(store && { store }),
  windowMs: 60 * 1000,
  max: isDev ? 60 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.ip || 'unknown',
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Too many verification attempts. Please try again later.',
      retryAfter: res.getHeader('Retry-After'),
      retryable: true,
      requestId: req.requestId,
    });
  },
});

/**
 * Fixed rate limiter for specific endpoints.
 * Dev mode relaxation requires explicit RATE_LIMIT_DEV_OVERRIDE=true.
 */
export const authRateLimiter = rateLimit({
  ...(store && { store }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 50 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Too many authentication attempts. Please try again later.',
      retryAfter: res.getHeader('Retry-After'),
      retryable: true,
      requestId: req.requestId,
    });
  },
});

/**
 * Faucet rate limiter — 1 claim per wallet per 24 hours.
 * Keys on wallet address (from request body) to prevent multi-key abuse.
 */
export const faucetRateLimiter = rateLimit({
  ...(store && { store }),
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: isDev ? 10 : 1,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const wallet = req.body?.walletAddress?.toLowerCase();
    return wallet ? `faucet:${wallet}` : req.ip || 'unknown';
  },
  handler: (req: Request, res: Response) => {
    const retryAfter = res.getHeader('Retry-After');
    const retryAfterNum = typeof retryAfter === 'string' ? parseInt(retryAfter, 10) : (typeof retryAfter === 'number' ? retryAfter : 0);
    res.status(429).json({
      error: 'Too Many Requests',
      code: 'FAUCET_COOLDOWN',
      message: 'Faucet limit reached — each wallet can claim once per 24 hours.',
      hint: 'Wait 24 hours or use a different wallet address.',
      retryAfter,
      retryAfterSeconds: retryAfterNum,
      nextAvailableAt: new Date(Date.now() + retryAfterNum * 1000).toISOString(),
      retryable: true,
      requestId: req.requestId,
    });
  },
});

/**
 * Registration rate limiter
 */
export const registerRateLimiter = rateLimit({
  ...(store && { store }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDev ? 20 : 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Too many registration attempts. Please try again later.',
      retryAfter: res.getHeader('Retry-After'),
      retryable: true,
      requestId: req.requestId,
    });
  },
});
