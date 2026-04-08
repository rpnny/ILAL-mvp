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
  // positionManager: env var takes precedence so Railway can be updated after
  // redeployment without a code change (see script/FixPositionManager.s.sol).
  positionManager: (process.env.POSITION_MANAGER_ADDRESS || '0x550c31a1861528Dca121ed634E50258fFA03fc58') as Address,
  complianceHook: '0x54b88a4aAC9E73F6581C19a06a2DC280Eba78a80' as Address,
};

// Demo tokens — tUSDC is an ILAL-controlled mintable token used to ensure the
// demo pool always has sufficient liquidity (the real Circle USDC faucet is
// rate-limited and requires browser interaction).
export const DEMO_TOKENS = {
  WETH: '0x4200000000000000000000000000000000000006' as Address,
  tUSDC: '0xa486Fb51ED09B970A23F7Fe910bc90089f78424D' as Address,
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

// ============ KYC Config ============
// Controls which KYC sources are enabled: "all" | "sumsub" | "eas" | "mock"
// "mock" preserves current auto-approve behavior for development
export const KYC_MODE = (process.env.KYC_MODE || 'mock') as 'all' | 'sumsub' | 'eas' | 'mock';

// Sumsub
export const SUMSUB_APP_TOKEN = process.env.SUMSUB_APP_TOKEN || '';
export const SUMSUB_SECRET_KEY = process.env.SUMSUB_SECRET_KEY || '';
export const SUMSUB_WEBHOOK_SECRET = process.env.SUMSUB_WEBHOOK_SECRET || '';
export const SUMSUB_LEVEL_NAME = process.env.SUMSUB_LEVEL_NAME || 'basic-kyc-level';
export const SUMSUB_BASE_URL = process.env.SUMSUB_BASE_URL || 'https://api.sumsub.com';

// Coinbase EAS (mirrors SDK constants from packages/sdk/src/constants/addresses.ts)
export const EAS_CONTRACT_ADDRESS = '0x4200000000000000000000000000000000000021' as Address;
export const COINBASE_ATTESTER_ADDRESS = '0x357458739F90461b99789350868CD7CF330Dd7EE' as Address;
export const EAS_SCHEMA_IDS = {
  VERIFIED_ACCOUNT: '0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9' as Hex,
  VERIFIED_COUNTRY: '0x1801901fabd0e6189356b4fb52bb0ab855276d84f7ec140839fbd1f6801ca065' as Hex,
} as const;

// ============ Rate Limit Config ============
export const RATE_LIMITS = {
  FREE: {
    windowMs: 60000,
    max: Number(process.env.RATE_LIMIT_MAX_REQUESTS_FREE) || 60,
    defaultKeyLimit: 60,
    monthlyQuota: 1000,
  },
  PRO: {
    windowMs: 60000,
    max: Number(process.env.RATE_LIMIT_MAX_REQUESTS_PRO) || 300,
    defaultKeyLimit: 300,
    monthlyQuota: 50000,
  },
  ENTERPRISE: {
    windowMs: 60000,
    max: Number(process.env.RATE_LIMIT_MAX_REQUESTS_ENTERPRISE) || 1000,
    defaultKeyLimit: 1000,
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
