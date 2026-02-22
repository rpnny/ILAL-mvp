/**
 * Auth Controller - Register, login, token refresh, email verification
 */

import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../utils/password.js';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../utils/jwt.js';
import { logger } from '../config/logger.js';
import { generateVerificationCode, sendVerificationEmail, sendWelcomeEmail } from '../services/email.service.js';

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

const verifyEmailSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

const resendCodeSchema = z.object({
  email: z.string().email(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().length(6, 'Code must be 6 digits'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

/**
 * User registration
 * POST /api/v1/auth/register
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    // Validate request body
    const body = registerSchema.parse(req.body);

    // Validate password strength
    const passwordValidation = validatePasswordStrength(body.password);
    if (!passwordValidation.valid) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Password does not meet requirements',
        details: passwordValidation.errors,
      });
      return;
    }

    // Check if email already exists
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

    // Check if wallet address already exists
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

    // Create user (email NOT verified yet)
    const passwordHash = await hashPassword(body.password);

    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        name: body.name,
        walletAddress: body.walletAddress,
        emailVerified: 1 as any, // Auto-verified — no email verification required
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

    // Generate tokens
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
 * Verify email with 6-digit code
 * POST /api/v1/auth/verify-email
 */
export async function verifyEmail(req: Request, res: Response): Promise<void> {
  try {
    const body = verifyEmailSchema.parse(req.body);

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (!user) {
      res.status(404).json({ error: 'Not Found', message: 'User not found' });
      return;
    }

    if (user.emailVerified) {
      res.status(400).json({ error: 'Bad Request', message: 'Email already verified' });
      return;
    }

    // Find valid verification code
    const verificationCode = await prisma.verificationCode.findFirst({
      where: {
        userId: user.id,
        code: body.code,
        type: 'EMAIL_VERIFY',
        used: 0 as any, // SQLite: 0=false
        // Note: SQLite string comparison for dates
      },
      orderBy: { createdAt: 'desc' },
    });

    // Manually check expiration for SQLite
    if (verificationCode) {
      const expiryDate = new Date(verificationCode.expiresAt);
      if (expiryDate < new Date()) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid or expired verification code',
        });
        return;
      }
    }

    if (!verificationCode) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid or expired verification code',
      });
      return;
    }

    // Mark code as used and verify email
    await prisma.$transaction([
      prisma.verificationCode.update({
        where: { id: verificationCode.id },
        data: { used: 1 as any }, // SQLite: 1=true
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: 1 as any }, // SQLite: 1=true
      }),
    ]);

    // Generate fresh tokens
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

    logger.info('Email verified', { userId: user.id, email: user.email });

    // Send welcome email (non-blocking)
    sendWelcomeEmail(user.email, user.name || undefined).catch(err =>
      logger.warn('Failed to send welcome email', { error: err.message })
    );

    res.json({
      message: 'Email verified successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        emailVerified: true,
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

    logger.error('Email verification failed', { error: error.message });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Verification failed',
    });
  }
}

/**
 * Resend verification code
 * POST /api/v1/auth/resend-code
 */
export async function resendCode(req: Request, res: Response): Promise<void> {
  try {
    const body = resendCodeSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (!user) {
      // Don't reveal if user exists or not
      res.json({ message: 'If the email is registered, a new code has been sent.' });
      return;
    }

    if (user.emailVerified) {
      res.status(400).json({ error: 'Bad Request', message: 'Email already verified' });
      return;
    }

    // Rate limit: check recent codes (max 5 per hour)
    const recentCodes = await prisma.verificationCode.count({
      where: {
        userId: user.id,
        type: 'EMAIL_VERIFY',
        createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });

    if (recentCodes >= 5) {
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Too many verification attempts. Please wait an hour before trying again.',
      });
      return;
    }

    // Generate and send new code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.verificationCode.create({
      data: {
        userId: user.id,
        code,
        type: 'EMAIL_VERIFY',
        expiresAt: expiresAt.toISOString(), // SQLite: store as ISO string
      },
    });

    await sendVerificationEmail(user.email, code, user.name || undefined);

    logger.info('Verification code resent', { userId: user.id, email: user.email });

    res.json({ message: 'Verification code sent. Please check your email.' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid request data',
        details: error.errors,
      });
      return;
    }

    logger.error('Resend code failed', { error: error.message });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to resend code',
    });
  }
}

/**
 * User login
 * POST /api/v1/auth/login
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    // Validate request body
    const body = loginSchema.parse(req.body);

    // Find user
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

    // Verify password
    const isValid = await verifyPassword(body.password, user.passwordHash);

    if (!isValid) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
      return;
    }

    // Generate tokens
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
    // Validate request body
    const body = refreshSchema.parse(req.body);

    // Verify refresh token
    const payload = verifyToken(body.refreshToken);

    // Check if user exists
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

    // Generate new access token
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      plan: user.plan,
    });

    res.json({
      accessToken,
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

/**
 * Forgot password — send reset code to email
 * POST /api/v1/auth/forgot-password
 */
export async function forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    const body = forgotPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: body.email } });

    // Always respond with success to avoid email enumeration
    if (!user) {
      res.json({ message: 'If that email is registered, a reset code has been sent.' });
      return;
    }

    // Rate limit: max 3 reset requests per hour
    const recentCodes = await prisma.verificationCode.count({
      where: {
        userId: user.id,
        type: 'PASSWORD_RESET',
        createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });

    if (recentCodes >= 3) {
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Too many reset attempts. Please wait before trying again.',
      });
      return;
    }

    const { generateVerificationCode: genCode, sendPasswordResetEmail } = await import('../services/email.service.js');
    const code = genCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    await prisma.verificationCode.create({
      data: {
        userId: user.id,
        code,
        type: 'PASSWORD_RESET',
        expiresAt: expiresAt.toISOString(),
      },
    });

    await sendPasswordResetEmail(user.email, code);

    logger.info('Password reset code sent', { userId: user.id, email: user.email });

    res.json({ message: 'If that email is registered, a reset code has been sent.' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Bad Request', message: 'Invalid email', details: error.errors });
      return;
    }
    logger.error('Forgot password failed', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to process request' });
  }
}

/**
 * Reset password with code
 * POST /api/v1/auth/reset-password
 */
export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const body = resetPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) {
      res.status(400).json({ error: 'Bad Request', message: 'Invalid or expired reset code' });
      return;
    }

    // Find valid reset code
    const verificationCode = await prisma.verificationCode.findFirst({
      where: {
        userId: user.id,
        code: body.code,
        type: 'PASSWORD_RESET',
        used: 0 as any,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verificationCode) {
      res.status(400).json({ error: 'Bad Request', message: 'Invalid or expired reset code' });
      return;
    }

    // Check expiration
    const expiryDate = new Date(verificationCode.expiresAt);
    if (expiryDate < new Date()) {
      res.status(400).json({ error: 'Bad Request', message: 'Invalid or expired reset code' });
      return;
    }

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(body.newPassword);
    if (!passwordValidation.valid) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Password does not meet requirements',
        details: passwordValidation.errors,
      });
      return;
    }

    const newHash = await hashPassword(body.newPassword);

    await prisma.$transaction([
      prisma.verificationCode.update({
        where: { id: verificationCode.id },
        data: { used: 1 as any },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash },
      }),
    ]);

    logger.info('Password reset successfully', { userId: user.id, email: user.email });

    res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Bad Request', message: 'Invalid request data', details: error.errors });
      return;
    }
    logger.error('Reset password failed', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to reset password' });
  }
}
