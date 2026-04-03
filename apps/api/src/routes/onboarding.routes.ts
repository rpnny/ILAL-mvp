/**
 * Onboarding Routes — Institution self-service registration
 */

import { Router } from 'express';
import * as onboardingController from '../controllers/onboarding.controller.js';
import { apiKeyMiddleware } from '../middleware/apikey.middleware.js';
import { hybridAuthMiddleware } from '../middleware/hybrid.middleware.js';

const router: Router = Router();

// All onboarding endpoints require authentication (API Key or JWT)
router.use(hybridAuthMiddleware);

router.post('/register', onboardingController.register);
router.post('/activate-session', onboardingController.activateSession);
router.post('/activate-session-demo', onboardingController.activateSessionDemo);
router.get('/status/:address', onboardingController.getStatus);
router.get('/attestation/:address', onboardingController.getAttestation);

export default router;
