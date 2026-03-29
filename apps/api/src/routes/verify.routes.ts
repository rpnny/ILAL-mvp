/**
 * Verification Routes - ZK Proof verification and session management
 */

import { Router, type Request, type Response } from 'express';
import * as verifyController from '../controllers/verify.controller.js';
import { apiKeyMiddleware, requirePermission } from '../middleware/apikey.middleware.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { dynamicRateLimiter, preAuthVerifyRateLimiter } from '../middleware/ratelimit.middleware.js';
import { usageTrackingMiddleware, quotaCheckMiddleware } from '../middleware/usage.middleware.js';

const router: Router = Router();

/**
 * GET /api/v1/verify/session?address=0x...
 * Dashboard-facing: returns session status for a wallet address.
 * Requires JWT auth (not API key) so the dashboard can call this directly.
 */
router.get('/session', authMiddleware, async (req: Request, res: Response) => {
    const { address } = req.query as { address?: string };
    if (!address) {
        res.status(400).json({ error: 'Missing required query param: address' });
        return;
    }

    req.params.address = address;
    await verifyController.getSessionStatus(req, res);
});

router.post('/renew', authMiddleware, verifyController.renewSession);

// POST /api/v1/verify - Verify ZK Proof and activate session (requires API key)
router.use(preAuthVerifyRateLimiter);
router.use(apiKeyMiddleware);
router.use(requirePermission('verify'));
router.use(dynamicRateLimiter);
router.use(quotaCheckMiddleware);
router.use(usageTrackingMiddleware);
router.post('/', verifyController.verifyAndActivate);

export default router;
