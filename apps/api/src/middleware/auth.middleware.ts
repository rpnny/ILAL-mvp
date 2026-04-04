/**
 * JWT Authentication Middleware
 */

import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.js';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { sendError } from './error-envelope.js';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        plan: string;
      };
    }
  }
}

/**
 * Requires a valid JWT access token in the Authorization header.
 * Rejects all requests that lack valid credentials.
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 401, {
      code: 'JWT_MISSING',
      message: 'Missing or malformed Authorization header',
      hint: 'Include "Authorization: Bearer <accessToken>" in the request headers',
      phase: 'auth',
    });
    return;
  }

  try {
    const token = authHeader.substring(7);
    const payload = verifyToken(token, 'access');

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, plan: true },
    });

    if (!user) {
      sendError(res, 401, {
        code: 'USER_NOT_FOUND',
        message: 'User not found',
        hint: 'The token references a deleted or non-existent account',
        phase: 'auth',
      });
      return;
    }

    req.user = {
      userId: user.id,
      email: user.email,
      plan: user.plan,
    };

    next();
  } catch (error: any) {
    logger.warn('Auth failed', { error: error.message });
    sendError(res, 401, {
      code: 'JWT_INVALID',
      message: 'Invalid or expired token',
      hint: 'Obtain a new access token via POST /api/v1/auth/login or use a refresh token',
      phase: 'auth',
    });
  }
}
