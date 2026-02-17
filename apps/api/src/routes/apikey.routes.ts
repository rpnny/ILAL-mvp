/**
 * API Key Management Routes
 */

import { Router } from 'express';
import * as apikeyController from '../controllers/apikey.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// All API Key routes require authentication
router.use(authMiddleware);

// GET /api/v1/apikeys - List all API Keys
router.get('/', apikeyController.listApiKeys);

// POST /api/v1/apikeys - Create new API Key
router.post('/', apikeyController.createApiKey);

// PATCH /api/v1/apikeys/:id - Update API Key
router.patch('/:id', apikeyController.updateApiKey);

// DELETE /api/v1/apikeys/:id - Revoke API Key
router.delete('/:id', apikeyController.deleteApiKey);

export default router;
