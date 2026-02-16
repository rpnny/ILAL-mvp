/**
 * 计费路由
 */

import { Router } from 'express';
import * as billingController from '../controllers/billing.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// GET /api/v1/usage/stats - 获取使用统计（需要认证）
router.get('/stats', authMiddleware, billingController.getUsageStats);

// GET /api/v1/billing/plans - 获取套餐列表（公开）
router.get('/plans', billingController.getPlans);

// POST /api/v1/billing/upgrade - 升级套餐（需要认证）
router.post('/upgrade', authMiddleware, billingController.upgradePlan);

// GET /api/v1/billing/invoices - 获取账单历史（需要认证）
router.get('/invoices', authMiddleware, billingController.getInvoices);

export default router;
