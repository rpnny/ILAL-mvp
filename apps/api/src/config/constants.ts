/**
 * Global constants configuration
 */

import dotenv from 'dotenv';
import { type Address, type Hex } from 'viem';

dotenv.config();

// ============ Server Config ============
export const PORT = Number(process.env.PORT) || 3001;
export const NODE_ENV = process.env.NODE_ENV || 'development';

// ============ Database Config ============
export const DATABASE_URL = process.env.DATABASE_URL!;

// ============ JWT Config ============
export const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
export const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

// ============ API Key Config ============
export const API_KEY_SECRET = process.env.API_KEY_SECRET || 'dev-api-key-secret';
export const API_KEY_PREFIX = 'ilal'; // API Key prefix

// ============ Blockchain Config ============
export const RPC_URL = process.env.RPC_URL || 'https://base-sepolia-rpc.publicnode.com';
export const CHAIN_ID = Number(process.env.CHAIN_ID) || 84532;

export const VERIFIER_PRIVATE_KEY = process.env.VERIFIER_PRIVATE_KEY as Hex;

export const CONTRACTS = {
  sessionManager: (process.env.SESSION_MANAGER_ADDRESS || '0x4CB61d41E8D4ceCFb8C477ed069adFF309fB6d0e') as Address,
  verifier: (process.env.VERIFIER_ADDRESS || '0x92eF7F6440466eb2138F7d179Cf2031902eF94be') as Address,
  simpleSwapRouter: (process.env.SIMPLE_SWAP_ROUTER_ADDRESS || '0x2aaf6c551168dcf22804c04dda2c08c82031f289') as Address,
  poolManager: (process.env.POOL_MANAGER_ADDRESS || '0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408') as Address,
  positionManager: (process.env.POSITION_MANAGER_ADDRESS || '0x5b460c8Bd32951183a721bdaa3043495D8861f31') as Address,
};

// ============ Rate Limit Config ============
export const RATE_LIMITS = {
  FREE: {
    windowMs: 60000, // 1 minute
    max: Number(process.env.RATE_LIMIT_MAX_REQUESTS_FREE) || 100, // Increased for free early access
    monthlyQuota: 10000, // Increased for free early access
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

// ============ Plan Pricing ============
export const PLAN_PRICING = {
  FREE: 0,
  PRO: 99, // USD/month
  ENTERPRISE: null, // Custom pricing
};

// ============ Validation ============
export function validateConfig() {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'API_KEY_SECRET',
  ];

  // Optional: for blockchain features
  const optional = ['VERIFIER_PRIVATE_KEY'];

  const missing = required.filter(key => !process.env[key]);
  const missingOptional = optional.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.error('💡 Please refer to .env.example for configuration');
    process.exit(1);
  }

  if (missingOptional.length > 0) {
    console.log('⚠️  Missing optional environment variables:', missingOptional.join(', '));
    console.log('   Some features (blockchain) may be disabled.');
  }
}
