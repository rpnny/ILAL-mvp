/**
 * Billing Routes
 * All protected endpoints use hybridAuthMiddleware (API Key or JWT).
 */

import { Router } from 'express';
import * as billingController from '../controllers/billing.controller.js';
import { hybridAuthMiddleware } from '../middleware/hybrid.middleware.js';

const router: Router = Router();

router.get('/stats', hybridAuthMiddleware, billingController.getUsageStats);
router.get('/plans', billingController.getPlans);
router.post('/upgrade', hybridAuthMiddleware, billingController.upgradePlan);
router.get('/invoices', hybridAuthMiddleware, billingController.getInvoices);

export default router;
