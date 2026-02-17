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
  return await bcrypt.hash(apiKey + API_KEY_SECRET, saltRounds);
}

/**
 * Verify API Key
 */
export async function verifyApiKey(apiKey: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(apiKey + API_KEY_SECRET, hash);
  } catch (error) {
    return false;
  }
}

/**
 * Extract API Key prefix (for fast lookup)
 */
export function extractApiKeyPrefix(apiKey: string): string {
  // Extract format "ilal_live" or "ilal_test"
  const parts = apiKey.split('_');
  if (parts.length >= 2) {
    return `${parts[0]}_${parts[1]}`;
  }
  return apiKey.substring(0, 10); // fallback
}

/**
 * Validate API Key format
 */
export function isValidApiKeyFormat(apiKey: string): boolean {
  const pattern = new RegExp(`^${API_KEY_PREFIX}_(test|live)_[a-f0-9]{48}$`);
  return pattern.test(apiKey);
}
