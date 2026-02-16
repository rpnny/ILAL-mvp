/**
 * 合约地址和 ABI 配置
 * 简化版本 - 用于 Web Demo
 */

import { type Address } from 'viem';

// Base Sepolia 合约地址
export const CONTRACT_ADDRESSES = {
  84532: {
    // Base Sepolia
    registry: '0x104DA869aDd4f1598127F03763a755e7dDE4f988' as Address,
    sessionManager: '0x4CB61d41E8D4ceCFb8C477ed069adFF309fB6d0e' as Address,
    verifier: '0x428aC1E38197bf37A42abEbA5f35B080438Ada22' as Address, // VerifierAdapter
    plonkVerifier: '0x92eF7F6440466eb2138F7d179Cf2031902eF94be' as Address,
    verifierAdapter: '0x428aC1E38197bf37A42abEbA5f35B080438Ada22' as Address,
    complianceHook: '0xc2eD8e6F4C3a29275cC43e435795c5528BC9CF6A' as Address,
    positionManager: '0x2A1046A6d0EBdbfe4e45072CAf25833f4FAaEAB4' as Address,
  },
} as const;

/**
 * 获取当前链的合约地址
 */
export function getContractAddresses(chainId: number = 84532) {
  return CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES] || CONTRACT_ADDRESSES[84532];
}

/**
 * SessionManager ABI
 */
export const sessionManagerABI = [
  {
    type: 'function',
    name: 'isSessionActive',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'getRemainingTime',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getSession',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'expiry', type: 'uint256' },
          { name: 'isActive', type: 'bool' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'startSession',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'expiry', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

/**
 * Registry ABI
 */
export const registryABI = [
  {
    type: 'function',
    name: 'getSessionTTL',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'isRouterApproved',
    stateMutability: 'view',
    inputs: [{ name: 'router', type: 'address' }],
    outputs: [{ type: 'bool' }],
  },
] as const;

/**
 * ComplianceHook ABI
 */
export const complianceHookABI = [
  {
    type: 'function',
    name: 'isUserAllowed',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'bool' }],
  },
] as const;

/**
 * Verifier ABI (用于 ZK Proof 验证)
 */
export const verifierABI = [
  {
    type: 'function',
    name: 'verify',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'proof', type: 'bytes' },
      { name: 'publicInputs', type: 'uint256[]' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const;
