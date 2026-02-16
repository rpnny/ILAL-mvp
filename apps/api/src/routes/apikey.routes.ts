/**
 * API Key 管理路由
 */

import { Router } from 'express';
import * as apikeyController from '../controllers/apikey.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// 所有 API Key 路由都需要认证
router.use(authMiddleware);

// GET /api/v1/apikeys - 列出所有 API Keys
router.get('/', apikeyController.listApiKeys);

// POST /api/v1/apikeys - 创建新的 API Key
router.post('/', apikeyController.createApiKey);

// PATCH /api/v1/apikeys/:id - 更新 API Key
router.patch('/:id', apikeyController.updateApiKey);

// DELETE /api/v1/apikeys/:id - 撤销 API Key
router.delete('/:id', apikeyController.deleteApiKey);

export default router;
