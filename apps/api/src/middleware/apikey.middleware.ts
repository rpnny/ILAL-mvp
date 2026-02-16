/**
 * API Key 认证中间件
 */

import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { verifyApiKey, extractApiKeyPrefix, isValidApiKeyFormat } from '../utils/apiKey.js';
import { logger } from '../config/logger.js';

// 扩展 Express Request 类型
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
 * API Key 认证中间件
 * 从 X-API-Key header 中提取和验证 API Key
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

    // 验证格式
    if (!isValidApiKeyFormat(apiKeyHeader)) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid API Key format',
      });
      return;
    }

    // 提取前缀用于快速查询
    const prefix = extractApiKeyPrefix(apiKeyHeader);

    // 查询 API Key（使用前缀过滤）
    const apiKeys = await prisma.apiKey.findMany({
      where: {
        keyPrefix: prefix,
        isActive: true,
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

    // 验证 API Key（需要逐个比对 hash）
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

    // 更新最后使用时间（异步，不阻塞请求）
    prisma.apiKey.update({
      where: { id: matchedKey.id },
      data: { lastUsedAt: new Date() },
    }).catch(err => {
      logger.error('Failed to update API Key lastUsedAt', { error: err.message });
    });

    // 将 API Key 和用户信息附加到 request
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
 * 权限检查中间件工厂函数
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
