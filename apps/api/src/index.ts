/**
 * ILAL API Service - Entry point
 * 
 * SaaS backend service:
 * - User authentication (register, login, JWT)
 * - API Key management
 * - ZK Proof verification (from original relay)
 * - Session management
 * - Billing and quota management
 */

import * as Sentry from '@sentry/node';
import { createServer } from './server.js';
import { prisma } from './config/database.js';
import { PORT, validateConfig } from './config/constants.js';
import { logger } from './config/logger.js';

// Initialize Sentry (before anything else)
// When SENTRY_DSN is set, errors will be automatically reported
Sentry.init({
  dsn: process.env.SENTRY_DSN, // Silently disabled if undefined
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: 0.1,
});

async function start() {
  try {
    // 1. Validate environment variables
    logger.info('Validating configuration...');
    validateConfig();

    // 2. Test database connection
    logger.info('Testing database connection...');
    await prisma.$connect();
    logger.info('Database connected successfully');

    // 3. Create Express server
    const app = await createServer();

    // 4. Start server
    const server = app.listen(PORT, () => {
      logger.info('═══════════════════════════════════════════════');
      logger.info('     ILAL API Service Started                 ');
      logger.info('═══════════════════════════════════════════════');
      logger.info(`  Port:        ${PORT}`);
      logger.info(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`  Health:      http://localhost:${PORT}/api/v1/health`);
      logger.info(`  API Docs:    http://localhost:${PORT}/api/v1/docs`);
      logger.info('');
      logger.info('API Endpoints:');
      logger.info('  POST   /api/v1/auth/register       - User registration');
      logger.info('  POST   /api/v1/auth/login          - User login');
      logger.info('  POST   /api/v1/auth/refresh        - Refresh token');
      logger.info('  GET    /api/v1/auth/me             - Get user info');
      logger.info('');
      logger.info('  GET    /api/v1/apikeys             - List API Keys');
      logger.info('  POST   /api/v1/apikeys             - Create API Key');
      logger.info('  DELETE /api/v1/apikeys/:id         - Revoke API Key');
      logger.info('');
      logger.info('  POST   /api/v1/verify              - ZK Proof verification');
      logger.info('  GET    /api/v1/session/:address    - Session status');
      logger.info('');
      logger.info('  GET    /api/v1/usage/stats         - Usage statistics');
      logger.info('  GET    /api/v1/billing/plans       - Plans list');
      logger.info('  POST   /api/v1/billing/upgrade     - Upgrade plan');
      logger.info('═══════════════════════════════════════════════');
    });

    // 5. Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down gracefully...');

      server.close(() => {
        logger.info('HTTP server closed');
      });

      await prisma.$disconnect();
      logger.info('Database disconnected');

      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error: any) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

// Start server
start();
