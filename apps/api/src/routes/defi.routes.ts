/**
 * DeFi Routes
 */

import { Router } from 'express';
import * as DefiController from '../controllers/defi.controller.js';
import { hybridAuthMiddleware as authenticate } from '../middleware/hybrid.middleware.js';
import { requirePermissionIfApiKey } from '../middleware/apikey.middleware.js';
import { dynamicRateLimiter } from '../middleware/ratelimit.middleware.js';

const router: Router = Router();

// Auth first, then rate limit (so rate limiter can use API Key ID as key)
router.use(authenticate);
router.use(dynamicRateLimiter);

// Self-check / environment-check endpoint (read-only, no permission required)
router.get('/preflight/:address', DefiController.preflightCheck);

// Balance query (read-only, no permission required)
router.get('/balance/:address', DefiController.getBalance);

// Quote endpoint (read-only, no gas needed)
router.get('/quote', requirePermissionIfApiKey('swap'), DefiController.getQuote);

// Infrastructure endpoints - protected by API Key OR JWT
router.post('/approve', requirePermissionIfApiKey('swap'), DefiController.approve);
router.post('/swap', requirePermissionIfApiKey('swap'), DefiController.executeSwap);
router.post('/liquidity', requirePermissionIfApiKey('liquidity'), DefiController.addLiquidity);

export default router;
