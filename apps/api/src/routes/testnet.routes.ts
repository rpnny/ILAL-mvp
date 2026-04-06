import { Router, type Router as ExpressRouter } from 'express';
import { hybridAuthMiddleware } from '../middleware/hybrid.middleware.js';
import { dynamicRateLimiter, faucetRateLimiter } from '../middleware/ratelimit.middleware.js';
import * as testnetController from '../controllers/testnet.controller.js';

const router: ExpressRouter = Router();

// Auth first, then rate limit (so limiter can key by API Key ID)
router.use(hybridAuthMiddleware);
router.use(dynamicRateLimiter);

// All endpoints require an API key — prevents unmetered public abuse on testnet.
router.post('/activate', testnetController.activate);
router.post('/activate-batch', testnetController.activateBatch);
router.post('/faucet', faucetRateLimiter, testnetController.faucet);

export default router;
