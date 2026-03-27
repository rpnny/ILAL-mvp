import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export function generateApiKey(type: 'live' | 'test' = 'live'): string {
  const random = crypto.randomBytes(24).toString('hex');
  return `ilal_${type}_${random}`;
}

export async function hashApiKey(key: string): Promise<string> {
  return bcrypt.hash(key, 10);
}

export async function verifyApiKey(key: string, hash: string): Promise<boolean> {
  return bcrypt.compare(key, hash);
}

export function extractApiKeyPrefix(key: string): string {
  return key.substring(0, 12);
}
