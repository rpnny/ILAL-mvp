/**
 * API Key generation and verification utilities
 */

import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { API_KEY_PREFIX, API_KEY_SECRET } from '../config/constants.js';

/**
 * Generate a new API Key
 * Format: ilal_env_randomstring
 * Example: ilal_live_1234567890abcdef1234567890abcdef
 */
export function generateApiKey(env: 'test' | 'live' = 'live'): string {
  const randomBytes = crypto.randomBytes(24); // 24 bytes = 48 hex chars
  const randomString = randomBytes.toString('hex');
  return `${API_KEY_PREFIX}_${env}_${randomString}`;
}

/**
 * Hash API Key (for storage)
 */
export async function hashApiKey(apiKey: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(apiKey, saltRounds);
}

/**
 * Verify API Key
 */
export async function verifyApiKey(apiKey: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(apiKey, hash);
  } catch (error) {
    return false;
  }
}

/**
 * Extract API Key prefix (for fast lookup)
 * Returns first 12 characters, e.g. "ilal_live_6a"
 * Must match the prefix stored by apps/landing when the key was created.
 */
export function extractApiKeyPrefix(apiKey: string): string {
  return apiKey.substring(0, 12);
}

/**
 * Validate API Key format
 */
export function isValidApiKeyFormat(apiKey: string): boolean {
  const pattern = new RegExp(`^${API_KEY_PREFIX}_(test|live)_[a-f0-9]{48}$`);
  return pattern.test(apiKey);
}
