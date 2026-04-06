/**
 * Redis client for distributed rate limiting.
 *
 * When REDIS_URL is set, returns a RedisStore for express-rate-limit.
 * When unavailable, returns undefined so callers fall back to in-memory.
 *
 * NOTE: This module uses dynamic import() because the project uses ESM.
 *       require() is NOT available in ESM modules.
 */

import { logger } from './logger.js';

let redisClient: any = null;
let redisStore: any = undefined;
let initialized = false;

/**
 * Initialize Redis client + RedisStore asynchronously.
 * Safe to call multiple times — only initializes once.
 */
export async function initRedis(): Promise<void> {
  if (initialized) return;
  initialized = true;

  const url = process.env.REDIS_URL;
  if (!url) {
    logger.info('REDIS_URL not set — rate limiting uses in-memory store (single instance only)');
    return;
  }

  try {
    const { default: Redis } = await import('ioredis');
    redisClient = new Redis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    redisClient.on('ready', () => {
      logger.info('Redis connected (rate limiting distributed)');
    });

    redisClient.on('error', (err: Error) => {
      logger.warn('Redis error', { error: err.message });
    });

    const { default: RedisStore } = await import('rate-limit-redis');
    redisStore = new RedisStore({
      sendCommand: (...args: string[]) => redisClient.call(...args),
    });

    logger.info('RedisStore created for rate limiting');
  } catch (err: any) {
    logger.warn('Failed to initialize Redis — falling back to in-memory rate limiting', { error: err.message });
    redisClient = null;
    redisStore = undefined;
  }
}

/**
 * Returns the RedisStore instance (or undefined if Redis unavailable).
 * Must call initRedis() first during server startup.
 */
export function getRedisStore(): any {
  return redisStore;
}

/**
 * Gracefully disconnect Redis. Call during shutdown.
 */
export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit().catch(() => {});
    redisClient = null;
    redisReady = false;
  }
}
