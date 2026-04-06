/**
 * DeFi Routes
 */

import { Router } from 'express';
import * as DefiController from '../controllers/defi.controller.js';
import { hybridAuthMiddleware as authenticate } from '../middleware/hybrid.middleware.js';
import { requirePermissionIfApiKey } from '../middleware/apikey.middleware.js';

const router: Router = Router();

// Self-check / environment-check endpoint (read-only, no permission required)
router.get('/preflight/:address', authenticate, DefiController.preflightCheck);

// Balance query (read-only, no permission required)
router.get('/balance/:address', authenticate, DefiController.getBalance);

// Quote endpoint (read-only, no gas needed)
router.get('/quote', authenticate, requirePermissionIfApiKey('swap'), DefiController.getQuote);

// Infrastructure endpoints - protected by API Key OR JWT
router.post('/approve', authenticate, requirePermissionIfApiKey('swap'), DefiController.approve);
router.post('/swap', authenticate, requirePermissionIfApiKey('swap'), DefiController.executeSwap);
router.post('/liquidity', authenticate, requirePermissionIfApiKey('liquidity'), DefiController.addLiquidity);

export default router;
