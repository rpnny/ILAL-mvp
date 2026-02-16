/**
 * 认证路由
 */

import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { authRateLimiter, registerRateLimiter } from '../middleware/ratelimit.middleware.js';

const router = Router();

// POST /api/v1/auth/register - 用户注册
router.post('/register', registerRateLimiter, authController.register);

// POST /api/v1/auth/login - 用户登录
router.post('/login', authRateLimiter, authController.login);

// POST /api/v1/auth/refresh - 刷新 access token
router.post('/refresh', authController.refresh);

// GET /api/v1/auth/me - 获取当前用户信息（需要认证）
router.get('/me', authMiddleware, authController.getMe);

export default router;
