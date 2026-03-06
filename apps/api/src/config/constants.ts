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
export const JWT_SECRET = process.env.JWT_SECRET!;
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || (JWT_SECRET + '_refresh');
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
export const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// ============ API Key Config ============
export const API_KEY_SECRET = process.env.API_KEY_SECRET!;
export const API_KEY_PREFIX = 'ilal';

// ============ Blockchain Config ============
export const RPC_URL = process.env.RPC_URL || 'https://base-sepolia-rpc.publicnode.com';
export const CHAIN_ID = Number(process.env.CHAIN_ID) || 84532;

export const VERIFIER_PRIVATE_KEY = process.env.VERIFIER_PRIVATE_KEY as Hex;

export const CONTRACTS = {
  sessionManager: (process.env.SESSION_MANAGER_ADDRESS || '0x4CB61d41E8D4ceCFb8C477ed069adFF309fB6d0e') as Address,
  verifier: (process.env.VERIFIER_ADDRESS || '0x92eF7F6440466eb2138F7d179Cf2031902eF94be') as Address,
  simpleSwapRouter: (process.env.SIMPLE_SWAP_ROUTER_ADDRESS || '0x9450fAfdE8aB1E68E29cB6F3faCaEC0CF2221C73') as Address,
  poolManager: (process.env.POOL_MANAGER_ADDRESS || '0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408') as Address,
  positionManager: (process.env.POSITION_MANAGER_ADDRESS || '0x664858fa4d3938788C7b7fE4f8d8f0864d087eA6') as Address,
  complianceHook: (process.env.COMPLIANCE_HOOK_ADDRESS || '0xE1AF9f1D1ddF819f729ec08A612a2212D1058a80') as Address,
};

// ============ ZK Verification Config ============
// Supports multiple Merkle roots for smooth tree rotation.
// EXPECTED_MERKLE_ROOT is the primary root.
// EXPECTED_MERKLE_ROOT_PREV is the previous root, accepted during a transition window.
export const EXPECTED_MERKLE_ROOT = process.env.EXPECTED_MERKLE_ROOT;
export const EXPECTED_MERKLE_ROOT_PREV = process.env.EXPECTED_MERKLE_ROOT_PREV;
export const EXPECTED_ISSUER_AX = process.env.EXPECTED_ISSUER_AX;
export const EXPECTED_ISSUER_AY = process.env.EXPECTED_ISSUER_AY;

/**
 * Returns the set of currently valid Merkle roots.
 * During a tree rotation, both current and previous roots are accepted.
 */
export function getValidMerkleRoots(): bigint[] {
  const roots: bigint[] = [];
  if (EXPECTED_MERKLE_ROOT) roots.push(BigInt(EXPECTED_MERKLE_ROOT));
  if (EXPECTED_MERKLE_ROOT_PREV) roots.push(BigInt(EXPECTED_MERKLE_ROOT_PREV));
  return roots;
}

// ============ Rate Limit Config ============
export const RATE_LIMITS = {
  FREE: {
    windowMs: 60000,
    max: Number(process.env.RATE_LIMIT_MAX_REQUESTS_FREE) || 10,
    monthlyQuota: 1000,
  },
  PRO: {
    windowMs: 60000,
    max: Number(process.env.RATE_LIMIT_MAX_REQUESTS_PRO) || 100,
    monthlyQuota: 50000,
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
  PRO: 99,
  ENTERPRISE: null,
};

// ============ Validation ============
export function validateConfig() {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'API_KEY_SECRET',
  ];

  const requiredInProduction = [
    'EXPECTED_MERKLE_ROOT',
    'EXPECTED_ISSUER_AX',
    'EXPECTED_ISSUER_AY',
    'VERIFIER_PRIVATE_KEY',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing.join(', '));
    console.error('Please refer to .env.example for configuration');
    process.exit(1);
  }

  if (NODE_ENV === 'production') {
    const missingProd = requiredInProduction.filter(key => !process.env[key]);
    if (missingProd.length > 0) {
      console.error('Missing required production environment variables:', missingProd.join(', '));
      process.exit(1);
    }
  } else {
    const missingOptional = requiredInProduction.filter(key => !process.env[key]);
    if (missingOptional.length > 0) {
      console.log('Warning: Missing optional environment variables:', missingOptional.join(', '));
      console.log('Some features (blockchain, ZK verification) may be disabled.');
    }
  }
}
