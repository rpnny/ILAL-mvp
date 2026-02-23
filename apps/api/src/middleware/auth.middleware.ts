/**
 * JWT Authentication Middleware
 */

import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.js';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';

// Extend Express Request type
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
 * Mock Authentication Middleware
 * Bypasses JWT and automatically injects a demo user for API Key generation
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    // Check if the frontend sent our mock token
    if (authHeader && authHeader === 'Bearer mock-access-token') {
      // Ensure the anonymous demo user exists in the database so foreign keys don't fail
      let user = await prisma.user.findUnique({
        where: { email: 'developer@ilal.xyz' },
        select: { id: true, email: true, plan: true }
      });

      if (!user) {
        // Auto-create the anonymous user if it doesn't exist yet
        user = await prisma.user.create({
          data: {
            id: 'usr_anonymous_demo',
            email: 'developer@ilal.xyz',
            passwordHash: 'not-needed-for-demo',
            name: 'ILAL Developer',
            emailVerified: 1, // SQLite: 1 = true
            plan: 'ENTERPRISE', // Give them enterprise limits
          },
          select: { id: true, email: true, plan: true }
        });
        logger.info('Auto-created anonymous demo user for direct access');
      }

      // Attach mock user info to request
      req.user = {
        userId: user.id,
        email: user.email,
        plan: user.plan,
      };

      next();
      return;
    }

    // If it's a real JWT token (legacy), try to verify it
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyToken(token);

      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true, plan: true },
      });

      if (user) {
        req.user = {
          userId: user.id,
          email: user.email,
          plan: user.plan,
        };
        next();
        return;
      }
    }

    // Since we want the API to be usable out of the box even without a token
    // header for public testing, fallback to the same anonymous user.
    let fallbackUser = await prisma.user.findUnique({
      where: { email: 'developer@ilal.xyz' },
      select: { id: true, email: true, plan: true }
    });

    if (!fallbackUser) {
      fallbackUser = await prisma.user.create({
        data: {
          id: 'usr_anonymous_demo',
          email: 'developer@ilal.xyz',
          passwordHash: 'not-needed-for-demo',
          name: 'ILAL Developer',
          emailVerified: 1,
          plan: 'ENTERPRISE',
        },
        select: { id: true, email: true, plan: true }
      });
    }

    req.user = {
      userId: fallbackUser.id,
      email: fallbackUser.email,
      plan: fallbackUser.plan,
    };
    next();

  } catch (error: any) {
    logger.warn('Auth middleware failed, but bypassing for public access', { error: error.message });
    // Still proceed so the user can test the API
    next();
  }
}
