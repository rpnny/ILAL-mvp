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
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { getAddress, type Address } from 'viem';

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

/**
 * POST /api/v1/verify/renew
 * Renew an active compliance session with strict limits:
 *   - Must have verified via ZK proof within REVERIFY_WINDOW (7 days)
 *   - Max MAX_RENEWALS_PER_VERIFY renewals before a new proof is required
 *   - Session must still be active (no post-expiry renewal)
 */
router.post('/renew', authMiddleware, async (req: Request, res: Response) => {
    const REVERIFY_WINDOW_SECONDS = 7 * 24 * 3600; // 7 days
    const MAX_RENEWALS_PER_VERIFY = 6; // max 6 renewals per ZK proof (= 7 days total)

    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
        if (!user?.walletAddress) {
            return res.status(400).json({
                error: 'No wallet address linked to your account. Update your profile first.',
            });
        }

        // Enforce re-verification window
        if (!user.lastVerifiedAt) {
            return res.status(403).json({
                error: 'No prior ZK verification found. Submit a proof via POST /api/v1/verify first.',
            });
        }

        const lastVerified = new Date(user.lastVerifiedAt).getTime() / 1000;
        const now = Math.floor(Date.now() / 1000);

        if (now - lastVerified > REVERIFY_WINDOW_SECONDS) {
            return res.status(403).json({
                error: 'ZK verification expired. Please re-verify with a new proof via POST /api/v1/verify.',
                lastVerifiedAt: user.lastVerifiedAt,
                maxWindowDays: 7,
            });
        }

        // Enforce max renewal count
        if (user.renewalCount >= MAX_RENEWALS_PER_VERIFY) {
            return res.status(403).json({
                error: 'Maximum renewals reached. Please re-verify with a new ZK proof via POST /api/v1/verify.',
                renewalCount: user.renewalCount,
                maxRenewals: MAX_RENEWALS_PER_VERIFY,
            });
        }

        const walletAddress = getAddress(user.walletAddress) as Address;
        const [isActive, remainingSeconds] = await Promise.all([
            blockchainService.isSessionActive(walletAddress),
            blockchainService.getRemainingTime(walletAddress),
        ]);

        if (!isActive) {
            return res.status(403).json({
                error: 'Session expired. Please re-verify with a new ZK proof via POST /api/v1/verify.',
            });
        }

        if (remainingSeconds > 12 * 3600) {
            return res.json({
                success: true,
                message: 'Session is still healthy — renewal not needed yet.',
                remainingSeconds,
                expiresAt: now + remainingSeconds,
            });
        }

        const result = await blockchainService.startSession(walletAddress);

        await prisma.user.update({
            where: { id: req.user.userId },
            data: { renewalCount: { increment: 1 } },
        });

        logger.info('Session renewed via dashboard', {
            userId: req.user.userId,
            walletAddress,
            txHash: result.txHash,
            renewalCount: user.renewalCount + 1,
        });

        return res.json({
            success: true,
            message: 'Session renewed successfully.',
            txHash: result.txHash,
            sessionExpiry: result.sessionExpiry.toString(),
            remainingSeconds: 24 * 3600,
            renewalsRemaining: MAX_RENEWALS_PER_VERIFY - user.renewalCount - 1,
        });
    } catch (err: any) {
        logger.error('Session renewal failed', { error: err.message });
        return res.status(500).json({ error: 'Session renewal failed', message: err.message });
    }
});

// POST /api/v1/verify - Verify ZK Proof and activate session (requires API key)
router.use(apiKeyMiddleware);
router.use(dynamicRateLimiter);
router.use(quotaCheckMiddleware);
router.use(usageTrackingMiddleware);
router.post('/', verifyController.verifyAndActivate);

export default router;
