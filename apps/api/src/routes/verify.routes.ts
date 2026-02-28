/**
 * Verification Routes - ZK Proof verification and session management
 */

import { Router, type Request, type Response } from 'express';
import * as verifyController from '../controllers/verify.controller.js';
import { apiKeyMiddleware } from '../middleware/apikey.middleware.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { dynamicRateLimiter } from '../middleware/ratelimit.middleware.js';
import { usageTrackingMiddleware, quotaCheckMiddleware } from '../middleware/usage.middleware.js';
import { blockchainService } from '../services/blockchain.service.js';
import { getAddress } from 'viem';

const router: Router = Router();

/**
 * GET /api/v1/verify/session?address=0x...
 * Dashboard-facing: returns session status for a wallet address.
 * Requires JWT auth (not API key) so the dashboard can call this directly.
 */
router.get('/session', authMiddleware, async (req: Request, res: Response) => {
    const { address } = req.query as { address?: string };

    if (!address) {
        return res.status(400).json({ error: 'Missing required query param: address' });
    }

    try {
        const checksummed = getAddress(address);
        const [active, remainingSeconds] = await Promise.all([
            blockchainService.isSessionActive(checksummed),
            blockchainService.getRemainingTime(checksummed),
        ]);

        const expiresAt = active
            ? Math.floor(Date.now() / 1000) + remainingSeconds
            : null;

        return res.json({ active, remainingSeconds, expiresAt });
    } catch (err: any) {
        return res.status(400).json({ error: err.message });
    }
});

// POST /api/v1/verify - Verify ZK Proof and activate session (requires API key)
router.use(apiKeyMiddleware);
router.use(dynamicRateLimiter);
router.use(quotaCheckMiddleware);
router.use(usageTrackingMiddleware);
router.post('/', verifyController.verifyAndActivate);

export default router;
