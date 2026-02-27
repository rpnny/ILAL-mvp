/**
 * Stripe Routes
 * POST /api/v1/stripe/create-session  — create Checkout Session (JWT auth required)
 * POST /api/v1/stripe/webhook         — Stripe webhook (raw body, no JWT)
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { createCheckoutSession, handleWebhook } from '../services/stripe.service.js';
import { logger } from '../config/logger.js';

const router: Router = Router();

const createSessionSchema = z.object({
    targetPlan: z.enum(['PRO', 'ENTERPRISE']),
});

/**
 * POST /api/v1/stripe/create-session
 * Creates a Stripe Checkout Session and returns the redirect URL
 */
router.post('/create-session', authMiddleware, async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
            return;
        }

        const body = createSessionSchema.parse(req.body);

        const origin = req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:3000';

        const { url } = await createCheckoutSession({
            userId: req.user.userId,
            userEmail: req.user.email,
            targetPlan: body.targetPlan,
            successUrl: `${origin}/dashboard/billing/success?plan=${body.targetPlan}`,
            cancelUrl: `${origin}/dashboard/settings`,
        });

        res.json({ url });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Bad Request', message: 'Invalid plan', details: error.errors });
            return;
        }
        logger.error('Create Stripe session failed', { error: error.message });
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
});

/**
 * POST /api/v1/stripe/webhook
 * Stripe sends events here. Must use raw body (registered before express.json).
 */
router.post('/webhook', async (req: Request, res: Response) => {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
        res.status(400).json({ error: 'Missing Stripe-Signature header' });
        return;
    }

    try {
        await handleWebhook(req.body as Buffer, signature);
        res.json({ received: true });
    } catch (error: any) {
        logger.error('Stripe webhook error', { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

export default router;
