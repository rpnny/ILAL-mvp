/**
 * Vercel Serverless Entry Point
 * Wraps the Express app as a Vercel serverless function.
 * The Express app is cached across warm invocations.
 */

import { createServer } from '../src/server.js';
import { prisma } from '../src/config/database.js';
import { validateConfig } from '../src/config/constants.js';

let app: any;

async function initApp() {
  if (app) return app;
  validateConfig();
  await prisma.$connect();
  app = await createServer();
  return app;
}

export default async function handler(req: any, res: any) {
  try {
    const expressApp = await initApp();
    return expressApp(req, res);
  } catch (err: any) {
    console.error('Server init failed:', err.message);
    res.status(500).json({ error: 'Server initialization failed' });
  }
}
