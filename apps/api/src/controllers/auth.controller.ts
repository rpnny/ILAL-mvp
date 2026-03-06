/**
 * Auth Controller - Register, login, token refresh
 */

import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../utils/password.js';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../utils/jwt.js';
import { logger } from '../config/logger.js';

// Request validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional(),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address').optional(),
  inviteCode: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string(),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

/**
 * User registration
 * POST /api/v1/auth/register
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const body = registerSchema.parse(req.body);

    const passwordValidation = validatePasswordStrength(body.password);
    if (!passwordValidation.valid) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Password does not meet requirements',
        details: passwordValidation.errors,
      });
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existingUser) {
      res.status(409).json({
        error: 'Conflict',
        message: 'Email already registered',
      });
      return;
    }

    if (body.walletAddress) {
      const existingWallet = await prisma.user.findUnique({
        where: { walletAddress: body.walletAddress },
      });

      if (existingWallet) {
        res.status(409).json({
          error: 'Conflict',
          message: 'Wallet address already registered',
        });
        return;
      }
    }

    const passwordHash = await hashPassword(body.password);

    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        name: body.name,
        walletAddress: body.walletAddress,
        plan: 'FREE',
      },
      select: {
        id: true,
        email: true,
        name: true,
        walletAddress: true,
        plan: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      plan: user.plan,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      plan: user.plan,
    });

    logger.info('User registered', { userId: user.id, email: user.email });

    res.status(201).json({
      user,
      accessToken,
      refreshToken,
      message: 'Registration successful.',
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

    logger.error('Register failed', { error: error.message });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Registration failed',
    });
  }
}

/**
 * User login
 * POST /api/v1/auth/login
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const body = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
      return;
    }

    const isValid = await verifyPassword(body.password, user.passwordHash);

    if (!isValid) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
      return;
    }

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      plan: user.plan,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      plan: user.plan,
    });

    logger.info('User logged in', { userId: user.id, email: user.email });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        walletAddress: user.walletAddress,
        plan: user.plan,
        emailVerified: user.emailVerified,
      },
      accessToken,
      refreshToken,
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

    logger.error('Login failed', { error: error.message });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Login failed',
    });
  }
}

/**
 * Refresh access token
 * POST /api/v1/auth/refresh
 */
export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const body = refreshSchema.parse(req.body);

    const payload = verifyToken(body.refreshToken, 'refresh');

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found',
      });
      return;
    }

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      plan: user.plan,
    });

    res.json({ accessToken });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid request data',
        details: error.errors,
      });
      return;
    }

    logger.error('Token refresh failed', { error: error.message });
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired refresh token',
    });
  }
}

/**
 * Get current user info
 * GET /api/v1/auth/me
 */
export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        walletAddress: true,
        plan: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
      });
      return;
    }

    res.json({ user });
  } catch (error: any) {
    logger.error('Get user info failed', { error: error.message });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve user information',
    });
  }
}
