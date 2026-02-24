import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Chain,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia, base } from 'viem/chains';
import { config } from './config.js';

// ============ 链配置 ============

const chains: Record<number, Chain> = {
  84532: baseSepolia,
  8453: base,
};

// ============ 合约 ABI ============

export const SESSION_MANAGER_ABI = [
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'isSessionActive',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'sessionExpiry',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'expiry', type: 'uint256' },
    ],
    name: 'startSession',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export const REGISTRY_ABI = [
  {
    inputs: [{ name: 'attester', type: 'address' }],
    name: 'isIssuerActive',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const COMPLIANCE_HOOK_ABI = [
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getNonce',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getDomainSeparator',
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const POSITION_MANAGER_ABI = [
  {
    inputs: [
      {
        components: [
          { name: 'currency0', type: 'address' },
          { name: 'currency1', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'tickSpacing', type: 'int24' },
          { name: 'hooks', type: 'address' },
        ],
        name: 'poolKey',
        type: 'tuple',
      },
      { name: 'tickLower', type: 'int24' },
      { name: 'tickUpper', type: 'int24' },
      { name: 'liquidity', type: 'uint128' },
      { name: 'hookData', type: 'bytes' },
    ],
    name: 'mint',
    outputs: [{ name: 'tokenId', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'liquidityDelta', type: 'uint128' },
      { name: 'hookData', type: 'bytes' },
    ],
    name: 'increaseLiquidity',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'liquidityDelta', type: 'uint128' },
      { name: 'hookData', type: 'bytes' },
    ],
    name: 'decreaseLiquidity',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'nextTokenId',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'getPosition',
    outputs: [
      { name: 'owner', type: 'address' },
      {
        components: [
          { name: 'currency0', type: 'address' },
          { name: 'currency1', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'tickSpacing', type: 'int24' },
          { name: 'hooks', type: 'address' },
        ],
        name: 'poolKey',
        type: 'tuple',
      },
      { name: 'liquidity', type: 'uint128' },
      { name: 'tickLower', type: 'int24' },
      { name: 'tickUpper', type: 'int24' },
      { name: 'createdAt', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// ============ 客户端创建 ============

const chain = chains[config.network.chainId] || baseSepolia;
const account = privateKeyToAccount(config.wallet.privateKey);

export const publicClient = createPublicClient({
  chain,
  transport: http(config.network.rpcUrl),
});

export const walletClient = createWalletClient({
  account,
  chain,
  transport: http(config.network.rpcUrl),
});

export const botAddress: Address = account.address;

// ============ 合约实例 ============

export const contracts = {
  registry: config.contracts.registry,
  sessionManager: config.contracts.sessionManager,
  complianceHook: config.contracts.complianceHook,
  positionManager: config.contracts.positionManager,
  poolManager: config.contracts.poolManager,
  simpleSwapRouter: config.contracts.simpleSwapRouter,
};
