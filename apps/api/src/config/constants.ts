/**
 * 全局常量配置
 */

import dotenv from 'dotenv';
import { type Address, type Hex } from 'viem';

dotenv.config();

// ============ 服务器配置 ============
export const PORT = Number(process.env.PORT) || 3001;
export const NODE_ENV = process.env.NODE_ENV || 'development';

// ============ 数据库配置 ============
export const DATABASE_URL = process.env.DATABASE_URL!;

// ============ JWT 配置 ============
export const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
export const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

// ============ API Key 配置 ============
export const API_KEY_SECRET = process.env.API_KEY_SECRET || 'dev-api-key-secret';
export const API_KEY_PREFIX = 'ilal'; // API Key 前缀

// ============ 区块链配置 ============
export const RPC_URL = process.env.RPC_URL || 'https://base-sepolia-rpc.publicnode.com';
export const CHAIN_ID = Number(process.env.CHAIN_ID) || 84532;

export const VERIFIER_PRIVATE_KEY = process.env.VERIFIER_PRIVATE_KEY as Hex;

export const CONTRACTS = {
  sessionManager: (process.env.SESSION_MANAGER_ADDRESS || '0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2') as Address,
  verifier: (process.env.VERIFIER_ADDRESS || '0x0cDcD82E5efba9De4aCc255402968397F323AFBB') as Address,
};

// ============ 限流配置 ============
export const RATE_LIMITS = {
  FREE: {
    windowMs: 60000, // 1分钟
    max: Number(process.env.RATE_LIMIT_MAX_REQUESTS_FREE) || 10,
    monthlyQuota: 100,
  },
  PRO: {
    windowMs: 60000,
    max: Number(process.env.RATE_LIMIT_MAX_REQUESTS_PRO) || 100,
    monthlyQuota: 10000,
  },
  ENTERPRISE: {
    windowMs: 60000,
    max: Number(process.env.RATE_LIMIT_MAX_REQUESTS_ENTERPRISE) || 1000,
    monthlyQuota: Infinity,
  },
};

// ============ 套餐价格 ============
export const PLAN_PRICING = {
  FREE: 0,
  PRO: 99, // USD/月
  ENTERPRISE: null, // 定制
};

// ============ 校验函数 ============
export function validateConfig() {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'API_KEY_SECRET',
    'VERIFIER_PRIVATE_KEY',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ 缺少必要的环境变量:', missing.join(', '));
    console.error('💡 请参考 .env.example 配置环境变量');
    process.exit(1);
  }
}
