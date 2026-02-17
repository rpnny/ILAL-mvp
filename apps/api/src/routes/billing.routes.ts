/**
 * Billing Routes
 */

import { Router } from 'express';
import * as billingController from '../controllers/billing.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// GET /api/v1/usage/stats - Get usage statistics (requires auth)
router.get('/stats', authMiddleware, billingController.getUsageStats);

// GET /api/v1/billing/plans - Get plans list (public)
router.get('/plans', billingController.getPlans);

// POST /api/v1/billing/upgrade - Upgrade plan (requires auth)
router.post('/upgrade', authMiddleware, billingController.upgradePlan);

// GET /api/v1/billing/invoices - Get billing history (requires auth)
router.get('/invoices', authMiddleware, billingController.getInvoices);

export default router;
