/**
 * Onboarding Routes — Institution self-service registration
 */

import { Router } from 'express';
import * as onboardingController from '../controllers/onboarding.controller.js';
import { hybridAuthMiddleware } from '../middleware/hybrid.middleware.js';
import { requirePermissionIfApiKey } from '../middleware/apikey.middleware.js';
import { dynamicRateLimiter } from '../middleware/ratelimit.middleware.js';

const router: Router = Router();

// All onboarding endpoints require authentication (API Key or JWT) + rate limiting
router.use(dynamicRateLimiter);
router.use(hybridAuthMiddleware);

router.post('/register', requirePermissionIfApiKey('session'), onboardingController.register);
router.post('/activate-session', requirePermissionIfApiKey('session'), onboardingController.activateSession);
router.post('/activate-session-demo', requirePermissionIfApiKey('session'), onboardingController.activateSessionDemo);
router.get('/status/:address', onboardingController.getStatus);
router.get('/attestation/:address', onboardingController.getAttestation);

export default router;
