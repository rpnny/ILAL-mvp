/**
 * Onboarding Routes — Institution self-service registration
 */

import { Router } from 'express';
import * as onboardingController from '../controllers/onboarding.controller.js';
import { hybridAuthMiddleware } from '../middleware/hybrid.middleware.js';
import { requirePermissionIfApiKey } from '../middleware/apikey.middleware.js';
import { dynamicRateLimiter } from '../middleware/ratelimit.middleware.js';

const router: Router = Router();

// Auth first, then rate limit (so limiter can key by API Key ID)
router.use(hybridAuthMiddleware);
router.use(dynamicRateLimiter);

router.post('/register', requirePermissionIfApiKey('session'), onboardingController.register);
router.post('/verify-eas', requirePermissionIfApiKey('session'), onboardingController.verifyEas);
router.post('/sumsub-token', requirePermissionIfApiKey('session'), onboardingController.sumsubToken);
router.post('/activate-session', requirePermissionIfApiKey('session'), onboardingController.activateSession);
router.post('/activate-session-demo', requirePermissionIfApiKey('session'), onboardingController.activateSessionDemo);
router.get('/status/:address', onboardingController.getStatus);
router.get('/attestation/:address', onboardingController.getAttestation);

export default router;
