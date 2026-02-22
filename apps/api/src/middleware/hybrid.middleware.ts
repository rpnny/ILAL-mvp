/**
 * Hybrid Authentication Middleware
 * Supports both API Key (server-to-server) and JWT (client-side) authentication
 */

import type { Request, Response, NextFunction } from 'express';
import { authMiddleware } from './auth.middleware.js';
import { apiKeyMiddleware } from './apikey.middleware.js';

export async function hybridAuthMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    // If X-API-Key header is present, use API Key authentication
    if (req.headers['x-api-key']) {
        return apiKeyMiddleware(req, res, next);
    }

    // Otherwise, default to JWT authentication
    return authMiddleware(req, res, next);
}
