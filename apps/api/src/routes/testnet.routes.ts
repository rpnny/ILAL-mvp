import { Router } from 'express';
import { hybridAuthMiddleware } from '../middleware/hybrid.middleware.js';
import * as testnetController from '../controllers/testnet.controller.js';

const router = Router();

// Both endpoints require an API key — prevents unmetered public abuse on testnet.
router.post('/activate', hybridAuthMiddleware, testnetController.activate);
router.post('/activate-batch', hybridAuthMiddleware, testnetController.activateBatch);

export default router;
