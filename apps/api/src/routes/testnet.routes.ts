import { Router, type Router as ExpressRouter } from 'express';
import { hybridAuthMiddleware } from '../middleware/hybrid.middleware.js';
import { dynamicRateLimiter, faucetRateLimiter } from '../middleware/ratelimit.middleware.js';
import * as testnetController from '../controllers/testnet.controller.js';

const router: ExpressRouter = Router();

// Rate limit all testnet routes
router.use(dynamicRateLimiter);

// All endpoints require an API key — prevents unmetered public abuse on testnet.
router.post('/activate', hybridAuthMiddleware, testnetController.activate);
router.post('/activate-batch', hybridAuthMiddleware, testnetController.activateBatch);
router.post('/faucet', faucetRateLimiter, hybridAuthMiddleware, testnetController.faucet);

export default router;
