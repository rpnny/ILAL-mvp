/**
 * Redis client for distributed rate limiting.
 *
 * When REDIS_URL is set, returns a RedisStore for express-rate-limit.
 * When unavailable, returns undefined so callers fall back to in-memory.
 */

import { logger } from './logger.js';

let redisClient: import('ioredis').default | null = null;
let redisReady = false;

function getClient(): import('ioredis').default | null {
  if (redisClient) return redisClient;

  const url = process.env.REDIS_URL;
  if (!url) return null;

  try {
    // Dynamic import avoids crash if ioredis isn't installed
    const Redis = require('ioredis') as typeof import('ioredis').default;
    redisClient = new Redis(url, {
      maxRetriesPerRequest: null, // required by rate-limit-redis
      enableReadyCheck: true,
      lazyConnect: false,
    });

    redisClient.on('ready', () => {
      redisReady = true;
      logger.info('Redis connected (rate limiting distributed)');
    });

    redisClient.on('error', (err) => {
      logger.warn('Redis error — falling back to in-memory rate limiting', { error: err.message });
      redisReady = false;
    });

    redisClient.on('close', () => {
      redisReady = false;
    });

    return redisClient;
  } catch (err: any) {
    logger.warn('Failed to initialize Redis client', { error: err.message });
    return null;
  }
}

/**
 * Returns a RedisStore for express-rate-limit, or undefined if Redis
 * is unavailable (in which case the default in-memory store is used).
 */
export function getRedisStore(): import('rate-limit-redis').default | undefined {
  const client = getClient();
  if (!client) return undefined;

  try {
    const { default: RedisStore } = require('rate-limit-redis') as { default: typeof import('rate-limit-redis').default };
    return new RedisStore({
      // @ts-expect-error - ioredis is compatible with rate-limit-redis sendCommand
      sendCommand: (...args: string[]) => client.call(...args),
    });
  } catch (err: any) {
    logger.warn('Failed to create RedisStore', { error: err.message });
    return undefined;
  }
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
