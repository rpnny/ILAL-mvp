/**
 * ILAL contract address configuration
 */

import type { Address } from 'viem';
import type { ContractAddresses } from '../types';

// Base Mainnet (8453)
export const BASE_MAINNET_ADDRESSES: ContractAddresses = {
  registry: '0x0000000000000000000000000000000000000000' as Address,
  sessionManager: '0x0000000000000000000000000000000000000000' as Address,
  verifier: '0x0000000000000000000000000000000000000000' as Address,
  complianceHook: '0x0000000000000000000000000000000000000000' as Address,
  positionManager: '0x0000000000000000000000000000000000000000' as Address,
  simpleSwapRouter: '0x0000000000000000000000000000000000000000' as Address,
  plonkVerifier: '0x0000000000000000000000000000000000000000' as Address,
  poolManager: '0x0000000000000000000000000000000000000000' as Address,
};

// Base Sepolia (84532) - last updated: 2026-02-27
export const BASE_SEPOLIA_ADDRESSES: ContractAddresses = {
  registry: '0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD' as Address,
  sessionManager: '0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2' as Address,
  verifier: '0x0cDcD82E5efba9De4aCc255402968397F323AFBB' as Address,
  complianceHook: '0xDeDcFDF10b03AB45eEbefD2D91EDE66D9E5c8a80' as Address,
  positionManager: '0x5b460c8Bd32951183a721bdaa3043495D8861f31' as Address,
  simpleSwapRouter: '0x851A12a1A0A5670F4D8A74aD0f3534825EC5e7c2' as Address, // fixed 2026-02-27: CurrencyNotSettled
  plonkVerifier: '0x2645C48A7DB734C9179A195C51Ea5F022B86261f' as Address,
  poolManager: '0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408' as Address,
};

/** Recommended RPC URL per chain */
export const CHAIN_RPC: Record<number, string> = {
  84532: 'https://base-sepolia-rpc.publicnode.com',
  8453: 'https://mainnet.base.org',
};

/** Chain config: contract addresses + recommended RPC */
export interface ChainConfig {
  chainId: number;
  addresses: ContractAddresses;
  rpcUrl: string;
}

/**
 * Get full chain config (addresses + recommended RPC) by chain ID.
 */
export function getChainConfig(chainId: number): ChainConfig | null {
  const addresses = getContractAddresses(chainId);
  const rpcUrl = CHAIN_RPC[chainId];
  if (!addresses || !rpcUrl) return null;
  return { chainId, addresses, rpcUrl };
}

/**
 * Get contract addresses by chain ID.
 * @returns Address set or null if chain is not supported
 */
export function getContractAddresses(chainId: number): ContractAddresses | null {
  switch (chainId) {
    case 84532:
      return BASE_SEPOLIA_ADDRESSES;
    case 8453:
      return BASE_MAINNET_ADDRESSES; // Mainnet placeholder, not deployed yet
    default:
      return null;
  }
}

/**
 * Check if an address is deployed (non-zero).
 */
export function isDeployed(address: Address): boolean {
  return address !== '0x0000000000000000000000000000000000000000';
}

// ============ Coinbase Verifications ============

export const COINBASE_ATTESTER_ADDRESS = '0x357458739F90461b99789350868CD7CF330Dd7EE' as Address;

// EAS Schema IDs
export const EAS_SCHEMA_IDS = {
  VERIFIED_ACCOUNT: '0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9',
  VERIFIED_COUNTRY: '0x1801901fabd0e6189356b4fb52bb0ab855276d84f7ec140839fbd1f6801ca065',
} as const;

// ============ Token addresses ============

export const BASE_SEPOLIA_TOKENS = {
  USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address,
  WETH: '0x4200000000000000000000000000000000000006' as Address,
} as const;

export const BASE_MAINNET_TOKENS = {
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address,
  WETH: '0x4200000000000000000000000000000000000006' as Address,
} as const;
