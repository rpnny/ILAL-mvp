/**
 * Verification Routes - ZK Proof verification and session management
 */

import { Router } from 'express';
import * as verifyController from '../controllers/verify.controller.js';
import { apiKeyMiddleware } from '../middleware/apikey.middleware.js';
import { dynamicRateLimiter } from '../middleware/ratelimit.middleware.js';
import { usageTrackingMiddleware, quotaCheckMiddleware } from '../middleware/usage.middleware.js';

const router: Router = Router();

// All verification routes require API Key authentication
router.use(apiKeyMiddleware);
router.use(dynamicRateLimiter);
router.use(quotaCheckMiddleware);
router.use(usageTrackingMiddleware);

// POST /api/v1/verify - Verify ZK Proof and activate session
router.post('/', verifyController.verifyAndActivate);

export default router;
