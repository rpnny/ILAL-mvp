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
  sessionManager: (process.env.SESSION_MANAGER_ADDRESS || '0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2') as Address,
  verifier: (process.env.VERIFIER_ADDRESS || '0x8e093aC51921fe2be9bd0910092a01200AAd6560') as Address,
  simpleSwapRouter: (process.env.SIMPLE_SWAP_ROUTER_ADDRESS || '0xd46D84Dc2D098c767451675C9BcB85bf3f8a2891') as Address,
  poolManager: (process.env.POOL_MANAGER_ADDRESS || '0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408') as Address,
  positionManager: (process.env.POSITION_MANAGER_ADDRESS || '0x692548a6E1797d2762b9d04f29112C172E5Cea32') as Address,
  complianceHook: (process.env.COMPLIANCE_HOOK_ADDRESS || '0xe633220f15932428FcA60A1A2C2C48797A180A80') as Address,
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
 * Combines static env-var roots with dynamic roots from the MerkleService.
 * During a tree rotation, both current and previous roots are accepted.
 */
export function getValidMerkleRoots(dynamicRoots?: { current: bigint; previous: bigint | null }): bigint[] {
  const set = new Set<bigint>();
  if (EXPECTED_MERKLE_ROOT) set.add(BigInt(EXPECTED_MERKLE_ROOT));
  if (EXPECTED_MERKLE_ROOT_PREV) set.add(BigInt(EXPECTED_MERKLE_ROOT_PREV));
  if (dynamicRoots) {
    if (dynamicRoots.current !== 0n) set.add(dynamicRoots.current);
    if (dynamicRoots.previous && dynamicRoots.previous !== 0n) set.add(dynamicRoots.previous);
  }
  return Array.from(set);
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
    monthlyQuota: -1, // -1 = unlimited
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
    'CORS_ORIGIN',
    'EXPECTED_MERKLE_ROOT',
    'EXPECTED_ISSUER_AX',
    'EXPECTED_ISSUER_AY',
    'JWT_REFRESH_SECRET',
    'VERIFIER_PRIVATE_KEY',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing.join(', '));
    console.error('Please refer to .env.example for configuration');
    process.exit(1);
  }

  // ZK/blockchain vars are required for proof verification endpoints,
  // but auth/apikey/billing endpoints work without them.
  // We warn (not exit) so a partial deployment remains functional.
  const missingZk = requiredInProduction.filter(key => !process.env[key]);
  if (missingZk.length > 0) {
    console.warn('Warning: Missing ZK/blockchain environment variables:', missingZk.join(', '));
    console.warn('ZK proof verification endpoints will be unavailable.');
  }
}
