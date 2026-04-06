/**
 * API Key Authentication Middleware
 *
 * Returns machine-readable error codes so developers can pinpoint failures:
 *   API_KEY_MISSING          – no X-API-Key header
 *   API_KEY_FORMAT_INVALID   – regex mismatch
 *   API_KEY_PREFIX_NOT_FOUND – no active keys with this prefix in DB
 *   API_KEY_HASH_MISMATCH    – bcrypt compare failed for all candidates
 *   API_KEY_EXPIRED          – key found but past expiresAt
 *   API_KEY_SCOPE_MISSING    – reserved for future permission checks
 */

import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { verifyApiKey, extractApiKeyPrefix, isValidApiKeyFormat } from '../utils/apiKey.js';
import { logger } from '../config/logger.js';

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

function apiKeyError(res: Response, code: string, message: string, hint: string) {
  res.status(401).json({ error: 'Unauthorized', code, message, hint });
}

export async function apiKeyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawApiKey = req.headers['x-api-key'] as string;

    if (!rawApiKey) {
      apiKeyError(res, 'API_KEY_MISSING', 'Missing X-API-Key header',
        'Include the X-API-Key header with your API key');
      return;
    }

    // Format validation — strict regex rejects any embedded whitespace, wrong length,
    // or non-hex characters. Leading/trailing OWS (space, tab) is stripped by the
    // HTTP/1.1 parser (RFC 7230 §3.2.3) before this code runs, so the application
    // layer cannot intercept it. The format regex is the authoritative gate.
    const apiKeyHeader = rawApiKey;
    if (!isValidApiKeyFormat(apiKeyHeader)) {
      apiKeyError(res, 'API_KEY_FORMAT_INVALID', 'API Key format is invalid',
        'Expected format: ilal_{test|live}_{48 hex characters}. Key must contain only lowercase hex digits with no spaces.');
      return;
    }

    const prefix = extractApiKeyPrefix(apiKeyHeader);

    // Include inactive keys so we can give a specific "inactive" error
    const apiKeys = await prisma.apiKey.findMany({
      where: { keyPrefix: prefix },
      include: {
        user: { select: { id: true, email: true, plan: true } },
      },
    });

    if (apiKeys.length === 0) {
      apiKeyError(res, 'API_KEY_PREFIX_NOT_FOUND',
        'No API Key found with this prefix',
        'Verify the key is correct, or check your API Keys dashboard');
      return;
    }

    let matchedKey: typeof apiKeys[0] | null = null;

    for (const key of apiKeys) {
      const isValid = await verifyApiKey(apiKeyHeader, key.key);
      if (isValid) {
        matchedKey = key;
        break;
      }
    }

    if (!matchedKey) {
      apiKeyError(res, 'API_KEY_HASH_MISMATCH',
        'API Key hash verification failed',
        'Ensure you are using the exact key returned at creation time');
      return;
    }

    if (!matchedKey.isActive) {
      apiKeyError(res, 'API_KEY_INACTIVE',
        'This API Key has been deactivated',
        'Reactivate or create a new key in the API Keys dashboard');
      return;
    }

    if (matchedKey.expiresAt && new Date(matchedKey.expiresAt) < new Date()) {
      apiKeyError(res, 'API_KEY_EXPIRED',
        `API Key expired at ${new Date(matchedKey.expiresAt).toISOString()}`,
        'Generate a new API key in the dashboard');
      return;
    }

    // Fire-and-forget last used update
    prisma.apiKey.update({
      where: { id: matchedKey.id },
      data: { lastUsedAt: new Date().toISOString() },
    }).catch((err: any) => {
      logger.error('Failed to update API Key lastUsedAt', { error: err.message });
    });

    // Legacy permission name normalization — old keys may have 'defi:swap' etc. in DB
    const LEGACY_MAP: Record<string, string> = {
      'defi:swap': 'swap',
      'defi:liquidity': 'liquidity',
      'usage:read': 'usage',
    };
    const rawPermissions = Array.isArray(matchedKey.permissions)
      ? matchedKey.permissions as string[]
      : typeof matchedKey.permissions === 'string'
        ? matchedKey.permissions.split(',').map(p => p.trim()).filter(Boolean)
        : [];

    req.apiKey = {
      id: matchedKey.id,
      userId: matchedKey.userId,
      permissions: rawPermissions.map(p => LEGACY_MAP[p] || p),
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
      code: 'API_KEY_INTERNAL_ERROR',
      message: 'API Key verification failed unexpectedly',
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
        code: 'API_KEY_MISSING',
        message: 'API Key required for this endpoint',
      });
      return;
    }

    if (!req.apiKey.permissions.includes(permission)) {
      res.status(403).json({
        error: 'Forbidden',
        code: 'API_KEY_SCOPE_MISSING',
        message: `Missing required permission: ${permission}`,
        hint: `Your key has permissions: [${req.apiKey.permissions.join(', ')}]. Add '${permission}' when creating a new key.`,
      });
      return;
    }

    next();
  };
}

/**
 * Permission check that only applies when auth is via API Key.
 * JWT (dashboard) users bypass this check — they have full access.
 */
export function requirePermissionIfApiKey(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.authMethod !== 'api_key') return next();
    return requirePermission(permission)(req, res, next);
  };
}
