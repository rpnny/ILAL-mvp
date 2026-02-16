/**
 * API Key 管理控制器
 */

import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { generateApiKey, hashApiKey, extractApiKeyPrefix } from '../utils/apiKey.js';
import { logger } from '../config/logger.js';

// 请求验证 schemas
const createApiKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  permissions: z.array(z.string()).default(['verify', 'session']),
  rateLimit: z.number().int().min(1).max(10000).optional(),
  expiresIn: z.number().int().positive().optional(), // 有效期（天）
});

/**
 * 列出用户的所有 API Keys
 * GET /api/v1/apikeys
 */
export async function listApiKeys(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: req.user.userId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        rateLimit: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ apiKeys });
  } catch (error: any) {
    logger.error('List API keys failed', { error: error.message });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve API keys',
    });
  }
}

/**
 * 创建新的 API Key
 * POST /api/v1/apikeys
 */
export async function createApiKey(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    // 验证请求体
    const body = createApiKeySchema.parse(req.body);

    // 检查用户已有的 API Key 数量（免费套餐限制）
    const existingKeysCount = await prisma.apiKey.count({
      where: {
        userId: req.user.userId,
        isActive: true,
      },
    });

    const maxKeys = req.user.plan === 'FREE' ? 2 : req.user.plan === 'PRO' ? 10 : Infinity;

    if (existingKeysCount >= maxKeys) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Maximum API keys limit reached for ${req.user.plan} plan (${maxKeys})`,
      });
      return;
    }

    // 生成新的 API Key
    const apiKey = generateApiKey('live');
    const apiKeyHash = await hashApiKey(apiKey);
    const prefix = extractApiKeyPrefix(apiKey);

    // 计算过期时间
    const expiresAt = body.expiresIn
      ? new Date(Date.now() + body.expiresIn * 24 * 60 * 60 * 1000)
      : null;

    // 创建 API Key 记录
    const createdKey = await prisma.apiKey.create({
      data: {
        userId: req.user.userId,
        key: apiKeyHash,
        keyPrefix: prefix,
        name: body.name,
        permissions: body.permissions, // PostgreSQL: 直接使用 JSON 数组
        rateLimit: body.rateLimit || 10,
        expiresAt: expiresAt,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        rateLimit: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    logger.info('API key created', {
      userId: req.user.userId,
      apiKeyId: createdKey.id,
    });

    // 返回完整的 API Key（只在创建时显示一次）
    res.status(201).json({
      apiKey: apiKey, // 完整 key，只显示一次
      ...createdKey,
      warning: 'Please save this API key securely. It will not be shown again.',
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid request data',
        details: error.errors,
      });
      return;
    }

    logger.error('Create API key failed', { error: error.message });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create API key',
    });
  }
}

/**
 * 撤销（删除）API Key
 * DELETE /api/v1/apikeys/:id
 */
export async function deleteApiKey(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const { id } = req.params;

    // 检查 API Key 是否存在且属于当前用户
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id,
        userId: req.user.userId,
      },
    });

    if (!apiKey) {
      res.status(404).json({
        error: 'Not Found',
        message: 'API key not found',
      });
      return;
    }

    // 软删除：设置为 inactive
    await prisma.apiKey.update({
      where: { id },
      data: { isActive: false },
    });

    logger.info('API key revoked', {
      userId: req.user.userId,
      apiKeyId: id,
    });

    res.json({
      message: 'API key revoked successfully',
    });
  } catch (error: any) {
    logger.error('Delete API key failed', { error: error.message });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to revoke API key',
    });
  }
}

/**
 * 更新 API Key
 * PATCH /api/v1/apikeys/:id
 */
export async function updateApiKey(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const { id } = req.params;
    const updateSchema = z.object({
      name: z.string().min(1).max(100).optional(),
      permissions: z.array(z.string()).optional(),
      rateLimit: z.number().int().min(1).max(10000).optional(),
    });

    const body = updateSchema.parse(req.body);

    // 检查 API Key 是否存在且属于当前用户
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id,
        userId: req.user.userId,
        isActive: true,
      },
    });

    if (!apiKey) {
      res.status(404).json({
        error: 'Not Found',
        message: 'API key not found',
      });
      return;
    }

    // 更新 API Key
    const updated = await prisma.apiKey.update({
      where: { id },
      data: body,
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        rateLimit: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    logger.info('API key updated', {
      userId: req.user.userId,
      apiKeyId: id,
    });

    res.json({ apiKey: updated });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid request data',
        details: error.errors,
      });
      return;
    }

    logger.error('Update API key failed', { error: error.message });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update API key',
    });
  }
}
