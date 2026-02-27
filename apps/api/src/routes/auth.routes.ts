/**
 * Authentication Routes
 */

import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { authRateLimiter, registerRateLimiter } from '../middleware/ratelimit.middleware.js';

const router: Router = Router();

// POST /api/v1/auth/register - User registration
router.post('/register', registerRateLimiter, authController.register);

// POST /api/v1/auth/login - User login
router.post('/login', authRateLimiter, authController.login);

// POST /api/v1/auth/verify-email - Verify email with code
router.post('/verify-email', authRateLimiter, authController.verifyEmail);

// POST /api/v1/auth/resend-code - Resend verification code
router.post('/resend-code', authRateLimiter, authController.resendCode);

// POST /api/v1/auth/refresh - Refresh access token
router.post('/refresh', authController.refresh);

// GET /api/v1/auth/me - Get current user info (requires auth)
router.get('/me', authMiddleware, authController.getMe);

export default router;
