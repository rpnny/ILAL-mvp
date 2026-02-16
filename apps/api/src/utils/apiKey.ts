/**
 * API Key 生成和验证工具
 */

import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { API_KEY_PREFIX, API_KEY_SECRET } from '../config/constants.js';

/**
 * 生成新的 API Key
 * 格式: ilal_env_randomstring
 * 例如: ilal_live_1234567890abcdef1234567890abcdef
 */
export function generateApiKey(env: 'test' | 'live' = 'live'): string {
  const randomBytes = crypto.randomBytes(24); // 24 bytes = 48 hex chars
  const randomString = randomBytes.toString('hex');
  return `${API_KEY_PREFIX}_${env}_${randomString}`;
}

/**
 * 哈希 API Key（用于存储）
 */
export async function hashApiKey(apiKey: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(apiKey + API_KEY_SECRET, saltRounds);
}

/**
 * 验证 API Key
 */
export async function verifyApiKey(apiKey: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(apiKey + API_KEY_SECRET, hash);
  } catch (error) {
    return false;
  }
}

/**
 * 提取 API Key 前缀（用于快速查询）
 */
export function extractApiKeyPrefix(apiKey: string): string {
  // 提取格式 "ilal_live" 或 "ilal_test"
  const parts = apiKey.split('_');
  if (parts.length >= 2) {
    return `${parts[0]}_${parts[1]}`;
  }
  return apiKey.substring(0, 10); // fallback
}

/**
 * 验证 API Key 格式
 */
export function isValidApiKeyFormat(apiKey: string): boolean {
  const pattern = new RegExp(`^${API_KEY_PREFIX}_(test|live)_[a-f0-9]{48}$`);
  return pattern.test(apiKey);
}
