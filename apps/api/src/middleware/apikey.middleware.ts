/**
 * API Key Authentication Middleware
 */

import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { verifyApiKey, extractApiKeyPrefix, isValidApiKeyFormat } from '../utils/apiKey.js';
import { logger } from '../config/logger.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      apiKey?: {
        id: string;
        userId: string;
        permissions: string[];
        rateLimit: number;
        keyPrefix: string;
      };
    }
  }
}

/**
 * API Key Authentication Middleware
 * Extracts and validates API Key from X-API-Key header
 */
export async function apiKeyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const apiKeyHeader = req.headers['x-api-key'] as string;

    if (!apiKeyHeader) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing X-API-Key header',
      });
      return;
    }

    // Validate format
    if (!isValidApiKeyFormat(apiKeyHeader)) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid API Key format',
      });
      return;
    }

    // Extract prefix for fast lookup
    const prefix = extractApiKeyPrefix(apiKeyHeader);

    // Query API Key (filter by prefix)
    const apiKeys = await prisma.apiKey.findMany({
      where: {
        keyPrefix: prefix,
        isActive: 1,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            plan: true,
          },
        },
      },
    });

    // Verify API Key (compare hashes one by one)
    let matchedKey: typeof apiKeys[0] | null = null;

    for (const key of apiKeys) {
      const isValid = await verifyApiKey(apiKeyHeader, key.key);
      if (isValid) {
        matchedKey = key;
        break;
      }
    }

    if (!matchedKey) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or inactive API Key',
      });
      return;
    }

    // Update last used time (async, non-blocking)
    prisma.apiKey.update({
      where: { id: matchedKey.id },
      data: { lastUsedAt: new Date() },
    }).catch(err => {
      logger.error('Failed to update API Key lastUsedAt', { error: err.message });
    });

    // Attach API Key and user info to request
    req.apiKey = {
      id: matchedKey.id,
      userId: matchedKey.userId,
      permissions: Array.isArray(matchedKey.permissions)
        ? matchedKey.permissions as string[]
        : [],
      rateLimit: matchedKey.rateLimit,
      keyPrefix: matchedKey.keyPrefix,
    };

    req.user = {
      userId: matchedKey.user.id,
      email: matchedKey.user.email,
      plan: matchedKey.user.plan,
    };

    next();
  } catch (error: any) {
    logger.error('API Key middleware failed', { error: error.message });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'API Key verification failed',
    });
  }
}

/**
 * Permission check middleware factory
 */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.apiKey) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'API Key required',
      });
      return;
    }

    if (!req.apiKey.permissions.includes(permission)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Missing required permission: ${permission}`,
      });
      return;
    }

    next();
  };
}
