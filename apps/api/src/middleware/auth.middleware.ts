/**
 * JWT Authentication Middleware
 */

import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.js';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';

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
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or malformed Authorization header',
    });
    return;
  }

  try {
    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (payload.type !== 'access') {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token type. Use an access token.',
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, plan: true },
    });

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found',
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
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    });
  }
}
