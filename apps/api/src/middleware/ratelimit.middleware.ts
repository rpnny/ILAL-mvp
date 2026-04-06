/**
 * Rate Limiting Middleware
 *
 * All rate limiters resolve the RedisStore lazily at first request,
 * so initRedis() can run during server startup before any requests arrive.
 */

import rateLimit from 'express-rate-limit';
import type { Request, Response, NextFunction } from 'express';
import { RATE_LIMITS } from '../config/constants.js';
import { getRedisStore } from '../config/redis.js';

const isDev = process.env.NODE_ENV === 'development' && process.env.RATE_LIMIT_DEV_OVERRIDE === 'true';

/** Cache rate limiter instances so they're created once (with the correct store). */
const limiterCache = new Map<string, ReturnType<typeof rateLimit>>();

function lazyLimiter(
  name: string,
  opts: Parameters<typeof rateLimit>[0],
) {
  return (req: Request, res: Response, next: NextFunction) => {
    let limiter = limiterCache.get(name);
    if (!limiter) {
      const store = getRedisStore();
      limiter = rateLimit({
        ...(store ? { store } : {}),
        ...opts,
      });
      limiterCache.set(name, limiter);
    }
    return limiter(req, res, next);
  };
}

/**
 * Dynamic rate limiter - adjusts rate limits based on user plan
 */
export const dynamicRateLimiter = lazyLimiter('dynamic', {
  windowMs: 60000, // 1 minute window
  max: (req: Request) => {
    const plan = (req.user?.plan as string) || 'FREE';
    const planMax = RATE_LIMITS[plan as keyof typeof RATE_LIMITS]?.max ?? RATE_LIMITS.FREE.max;
    // If the API key has a custom rateLimit set, use whichever is higher
    const keyMax = req.apiKey?.rateLimit ?? 0;
    return Math.max(planMax, keyMax);
  },
  standardHeaders: true,
  legacyHeaders: false,
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
    if (req.apiKey?.id) return `apikey:${req.apiKey.id}`;
    if (req.user?.userId) return `user:${req.user.userId}`;
    return req.ip || 'unknown';
  },
});

/**
 * Pre-auth rate limiter for expensive API-key protected endpoints.
 */
export const preAuthVerifyRateLimiter = lazyLimiter('preAuthVerify', {
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
 * Fixed rate limiter for auth endpoints.
 */
export const authRateLimiter = lazyLimiter('auth', {
  windowMs: 15 * 60 * 1000,
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
 */
export const faucetRateLimiter = lazyLimiter('faucet', {
  windowMs: 24 * 60 * 60 * 1000,
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
export const registerRateLimiter = lazyLimiter('register', {
  windowMs: 60 * 60 * 1000,
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
