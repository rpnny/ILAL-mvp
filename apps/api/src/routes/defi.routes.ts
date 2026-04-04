/**
 * DeFi Routes
 */

import { Router } from 'express';
import * as DefiController from '../controllers/defi.controller.js';
import { hybridAuthMiddleware as authenticate } from '../middleware/hybrid.middleware.js';

const router: Router = Router();

// Self-check / environment-check endpoint
router.get('/preflight/:address', authenticate, DefiController.preflightCheck);

// Infrastructure endpoints - protected by API Key OR JWT
router.post('/swap', authenticate, DefiController.executeSwap);
router.post('/liquidity', authenticate, DefiController.addLiquidity);

export default router;
