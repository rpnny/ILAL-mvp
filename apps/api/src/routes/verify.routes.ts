/**
 * 验证路由 - ZK Proof 验证和 Session 管理
 */

import { Router } from 'express';
import * as verifyController from '../controllers/verify.controller.js';
import { apiKeyMiddleware } from '../middleware/apikey.middleware.js';
import { dynamicRateLimiter } from '../middleware/ratelimit.middleware.js';
import { usageTrackingMiddleware, quotaCheckMiddleware } from '../middleware/usage.middleware.js';

const router = Router();

// 所有验证路由都需要 API Key 认证
router.use(apiKeyMiddleware);
router.use(dynamicRateLimiter);
router.use(quotaCheckMiddleware);
router.use(usageTrackingMiddleware);

// POST /api/v1/verify - 验证 ZK Proof 并激活 Session
router.post('/', verifyController.verifyAndActivate);

export default router;
