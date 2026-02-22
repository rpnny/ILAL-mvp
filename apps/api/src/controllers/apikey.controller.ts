/**
 * API Key Management Controller
 */

import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { generateApiKey, hashApiKey, extractApiKeyPrefix } from '../utils/apiKey.js';
import { logger } from '../config/logger.js';

// Request validation schemas
const createApiKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  permissions: z.array(z.string()).default(['verify', 'session']),
  rateLimit: z.number().int().min(1).max(10000).optional(),
  expiresIn: z.number().int().positive().optional(), // Expiration period (days)
});

/**
 * List user's API Keys
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
 * Create a new API Key
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

    // Validate request body
    const body = createApiKeySchema.parse(req.body);

    // Check existing API Key count (free plan limit)
    const existingKeysCount = await prisma.apiKey.count({
      where: {
        userId: req.user.userId,
        isActive: 1 as any, // SQLite: 1=true
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

    // Generate new API Key
    const apiKey = generateApiKey('live');
    const apiKeyHash = await hashApiKey(apiKey);
    const prefix = extractApiKeyPrefix(apiKey);

    // Calculate expiration time (SQLite: store as ISO string)
    const expiresAt = body.expiresIn
      ? new Date(Date.now() + body.expiresIn * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Create API Key record
    const createdKey = await prisma.apiKey.create({
      data: {
        userId: req.user.userId,
        key: apiKeyHash,
        keyPrefix: prefix,
        name: body.name,
        permissions: body.permissions.join(','), // SQLite: comma-separated string
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

    // Return full API Key (only shown once at creation)
    res.status(201).json({
      apiKey: apiKey, // Full key, shown only once
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
 * Revoke (delete) API Key
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

    // Check if API Key exists and belongs to current user
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

    // Soft delete: set to inactive
    await prisma.apiKey.update({
      where: { id },
      data: { isActive: 0 as any }, // SQLite: 0=false
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
 * Update API Key
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

    // Check if API Key exists and belongs to current user
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id,
        userId: req.user.userId,
        isActive: 1 as any, // SQLite: 1=true
      },
    });

    if (!apiKey) {
      res.status(404).json({
        error: 'Not Found',
        message: 'API key not found',
      });
      return;
    }

    // Update API Key (convert permissions array to comma-separated string for SQLite)
    const updateData: any = { ...body };
    if (body.permissions) {
      updateData.permissions = body.permissions.join(',');
    }
    
    const updated = await prisma.apiKey.update({
      where: { id },
      data: updateData,
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
