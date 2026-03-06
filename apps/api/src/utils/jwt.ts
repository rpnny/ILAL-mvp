/**
 * JWT Token utility functions
 */

import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_REFRESH_SECRET, JWT_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN } from '../config/constants.js';

export interface JWTPayload {
  userId: string;
  email: string;
  plan: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

/**
 * Generate access token (short-lived, 1 hour default)
 */
export function generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp' | 'type'>): string {
  return jwt.sign({ ...payload, type: 'access' }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as any,
  });
}

/**
 * Generate refresh token (longer-lived, separate secret)
 */
export function generateRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp' | 'type'>): string {
  return jwt.sign({ ...payload, type: 'refresh' }, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN as any,
  });
}

/**
 * Verify and decode a token. Uses the correct secret based on expected type.
 */
export function verifyToken(token: string, expectedType?: 'access' | 'refresh'): JWTPayload {
  try {
    const secret = expectedType === 'refresh' ? JWT_REFRESH_SECRET : JWT_SECRET;
    const payload = jwt.verify(token, secret) as JWTPayload;

    if (expectedType && payload.type !== expectedType) {
      throw new Error(`Expected ${expectedType} token, got ${payload.type}`);
    }

    return payload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Decode token without signature verification (for debugging only)
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (error) {
    return null;
  }
}
