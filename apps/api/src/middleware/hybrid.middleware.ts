/**
 * Hybrid Authentication Middleware
 *
 * Strategy (no silent fallback):
 *   - X-API-Key header present → API Key auth only. Fail = 401 with error code.
 *   - X-API-Key absent → JWT auth (Authorization: Bearer).
 *   - On success, sets req.authMethod so downstream handlers know which path was used.
 */

import type { Request, Response, NextFunction } from 'express';
import { authMiddleware } from './auth.middleware.js';
import { apiKeyMiddleware } from './apikey.middleware.js';

declare global {
  namespace Express {
    interface Request {
      authMethod?: 'api_key' | 'jwt';
    }
  }
}

export async function hybridAuthMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    if (req.headers['x-api-key']) {
        return apiKeyMiddleware(req, res, (err?: any) => {
            if (err) return next(err);
            req.authMethod = 'api_key';
            next();
        });
    }

    return authMiddleware(req, res, (err?: any) => {
        if (err) return next(err);
        req.authMethod = 'jwt';
        next();
    });
}
