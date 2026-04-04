/**
 * Express Server Configuration
 */

import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { logger } from './config/logger.js';

// Import routes
import authRoutes from './routes/auth.routes.js';
import apikeyRoutes from './routes/apikey.routes.js';
import verifyRoutes from './routes/verify.routes.js';
import billingRoutes from './routes/billing.routes.js';
import stripeRoutes from './routes/stripe.routes.js';
import onboardingRoutes from './routes/onboarding.routes.js';
import { hybridAuthMiddleware } from './middleware/hybrid.middleware.js';

// Import controllers
import * as verifyController from './controllers/verify.controller.js';

// Import services for initialization
import * as issuerService from './services/issuer.service.js';
import * as merkleService from './services/merkle.service.js';
import { liquidityKeeper } from './services/liquidity-keeper.service.js';

export async function createServer(): Promise<express.Application> {
  const app = express();
  const trustProxyConfig = process.env.TRUST_PROXY ?? (process.env.NODE_ENV === 'production' ? '1' : 'false');

  if (trustProxyConfig === 'true') {
    app.set('trust proxy', true);
  } else if (trustProxyConfig === 'false') {
    app.set('trust proxy', false);
  } else if (/^\d+$/.test(trustProxyConfig)) {
    app.set('trust proxy', Number(trustProxyConfig));
  } else {
    app.set('trust proxy', trustProxyConfig);
  }

  // ============ Middleware ============

  // IMPORTANT: Stripe webhook must be registered BEFORE express.json()
  // because it needs the raw request body for signature verification
  const { handleWebhook } = await import('./services/stripe.service.js');
  const { logger: log } = await import('./config/logger.js');
  app.post('/api/v1/stripe/webhook',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      const sig = req.headers['stripe-signature'] as string;
      if (!sig) { res.status(400).json({ error: 'Missing Stripe-Signature header' }); return; }
      try {
        await handleWebhook(req.body as Buffer, sig);
        res.json({ received: true });
      } catch (err: any) {
        log.error('Stripe webhook error', { error: err.message });
        res.status(400).json({ error: err.message });
      }
    }
  );

  // Security headers
  app.use(helmet());

  // CORS
  // CORS_ORIGIN can be a comma-separated list of allowed origins.
  // Defaults to '*' in development; production should set an explicit allowlist.
  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : (process.env.NODE_ENV === 'production' ? false : '*');
  app.use(cors({
    origin: corsOrigins,
    credentials: corsOrigins !== '*',
  }));

  // JSON body parser
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info('Request', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
      });
    });
    next();
  });

  // ============ Routes ============

  // Health check (no auth required)
  app.get('/api/v1/health', verifyController.healthCheck);
  app.get('/health', verifyController.healthCheck);

  // Auth routes
  app.use('/api/v1/auth', authRoutes);

  // API Key management routes
  app.use('/api/v1/apikeys', apikeyRoutes);

  // Verify routes (ZK Proof)
  app.use('/api/v1/verify', verifyRoutes);

  // Session query route (mounted separately)
  app.get('/api/v1/session/:address', hybridAuthMiddleware, verifyController.getSessionStatus);

  // Usage statistics routes
  app.use('/api/v1/usage', billingRoutes);

  // Billing routes
  app.use('/api/v1/billing', billingRoutes);

  // Stripe routes (create-session, etc. — webhook is handled above)
  app.use('/api/v1/stripe', stripeRoutes);

  // Onboarding routes (institution self-service)
  app.use('/api/v1/onboarding', onboardingRoutes);

  // Testnet shortcut routes (mock KYC + session activation in one call)
  const { default: testnetRoutes } = await import('./routes/testnet.routes.js');
  app.use('/api/v1/testnet', testnetRoutes);

  // DeFi routes (Infrastructure)
  const { default: defiRoutes } = await import('./routes/defi.routes.js');
  app.use('/api/v1/defi', defiRoutes);

  // Top-level preflight alias so GET /api/v1/preflight/:address also works
  const { preflightCheck } = await import('./controllers/defi.controller.js');
  app.get('/api/v1/preflight/:address', hybridAuthMiddleware, preflightCheck);

  // Initialize Issuer + Merkle services (non-blocking; errors are logged)
  try {
    await issuerService.initialize();
    await merkleService.initialize();
    logger.info('Onboarding services ready (Issuer + Merkle tree)');
  } catch (err: any) {
    logger.warn('Onboarding services failed to initialize — onboarding endpoints will be unavailable', {
      error: err.message,
    });
  }

  // Start liquidity keeper (self-healing pool depth + relay session auto-renewal)
  liquidityKeeper.start();

  // Root path
  app.get('/', (req: Request, res: Response) => {
    res.json({
      service: 'ILAL API',
      version: '1.0.0',
      documentation: '/api/v1/docs',
      health: '/api/v1/health',
    });
  });

  // ============ Error Handling ============

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      message: 'The requested resource was not found',
      path: req.path,
    });
  });

  // Global error handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    logger.error('Unhandled error', {
      error: err.message,
      stack: err.stack,
      path: req.path,
    });

    res.status(err.status || 500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
    });
  });

  return app;
}
