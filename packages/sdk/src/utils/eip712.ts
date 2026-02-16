/**
 * ILAL EIP-712 签名工具
 * 使用 viem 实现的 EIP-712 签名功能
 */

import type { Address, Hex, WalletClient, PublicClient } from 'viem';
import { encodeAbiParameters, parseAbiParameters } from 'viem';
import type { SwapPermit, LiquidityPermit, SignedPermit, EIP712Domain } from '../types';

// ============ EIP-712 域 ============

/**
 * 获取 EIP-712 域配置
 */
export function getDomain(chainId: number, hookAddress: Address): EIP712Domain {
  return {
    name: 'ILAL ComplianceHook',
    version: '1',
    chainId,
    verifyingContract: hookAddress,
  };
}

// ============ EIP-712 类型定义 ============

export const SWAP_PERMIT_TYPES = {
  SwapPermit: [
    { name: 'user', type: 'address' },
    { name: 'deadline', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
  ],
} as const;

export const LIQUIDITY_PERMIT_TYPES = {
  LiquidityPermit: [
    { name: 'user', type: 'address' },
    { name: 'deadline', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'isAdd', type: 'bool' },
  ],
} as const;

// ============ 签名函数 ============

/**
 * 为 Swap 生成 EIP-712 签名
 */
export async function signSwapPermit(
  walletClient: WalletClient,
  hookAddress: Address,
  chainId: number,
  user: Address,
  deadline: bigint,
  nonce: bigint
): Promise<Hex> {
  const domain = getDomain(chainId, hookAddress);

  const message: SwapPermit = {
    user,
    deadline,
    nonce,
  };

  // 使用 viem 的 signTypedData
  const signature = await walletClient.signTypedData({
    account: user,
    domain,
    types: SWAP_PERMIT_TYPES,
    primaryType: 'SwapPermit',
    message,
  });

  return signature;
}

/**
 * 为流动性操作生成 EIP-712 签名
 */
export async function signLiquidityPermit(
  walletClient: WalletClient,
  hookAddress: Address,
  chainId: number,
  user: Address,
  deadline: bigint,
  nonce: bigint,
  isAdd: boolean
): Promise<Hex> {
  const domain = getDomain(chainId, hookAddress);

  const message: LiquidityPermit = {
    user,
    deadline,
    nonce,
    isAdd,
  };

  const signature = await walletClient.signTypedData({
    account: user,
    domain,
    types: LIQUIDITY_PERMIT_TYPES,
    primaryType: 'LiquidityPermit',
    message,
  });

  return signature;
}

// ============ 编码 hookData ============

/**
 * 编码 hookData 用于合约调用
 */
export function encodeHookData(permit: SignedPermit): Hex {
  return encodeAbiParameters(
    parseAbiParameters('address, uint256, uint256, bytes'),
    [permit.user, permit.deadline, permit.nonce, permit.signature]
  );
}

/**
 * 编码简化的 hookData（仅用户地址，用于白名单模式）
 */
export function encodeWhitelistHookData(user: Address): Hex {
  return user.toLowerCase() as Hex;
}

// ============ 辅助函数 ============

/**
 * 获取默认 deadline (当前时间 + 指定分钟)
 */
export function getDefaultDeadline(minutes: number = 20): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + minutes * 60);
}

/**
 * 从合约读取用户当前 nonce
 */
export async function getNonce(
  publicClient: PublicClient,
  hookAddress: Address,
  userAddress: Address
): Promise<bigint> {
  const nonce = await publicClient.readContract({
    address: hookAddress,
    abi: [
      {
        type: 'function',
        name: 'getNonce',
        inputs: [{ name: 'user', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
      },
    ],
    functionName: 'getNonce',
    args: [userAddress],
  });

  return nonce;
}

// ============ 完整流程 ============

/**
 * 完整签名流程：获取 nonce -> 签名 -> 编码
 */
export async function createSignedSwapPermit(
  walletClient: WalletClient,
  publicClient: PublicClient,
  hookAddress: Address,
  chainId: number,
  userAddress?: Address
): Promise<Hex> {
  // 1. 获取用户地址
  const user = userAddress || (walletClient.account?.address as Address);
  if (!user) {
    throw new EIP712SigningError('No user address available');
  }

  // 2. 获取当前 nonce
  const nonce = await getNonce(publicClient, hookAddress, user);

  // 3. 设置 deadline
  const deadline = getDefaultDeadline();

  // 4. 生成签名
  const signature = await signSwapPermit(
    walletClient,
    hookAddress,
    chainId,
    user,
    deadline,
    nonce
  );

  // 5. 编码 hookData
  const hookData = encodeHookData({
    user,
    deadline,
    nonce,
    signature,
  });

  return hookData;
}

/**
 * 创建流动性许可签名
 */
export async function createSignedLiquidityPermit(
  walletClient: WalletClient,
  publicClient: PublicClient,
  hookAddress: Address,
  chainId: number,
  isAdd: boolean,
  userAddress?: Address
): Promise<Hex> {
  const user = userAddress || (walletClient.account?.address as Address);
  if (!user) {
    throw new EIP712SigningError('No user address available');
  }

  const nonce = await getNonce(publicClient, hookAddress, user);
  const deadline = getDefaultDeadline();

  const signature = await signLiquidityPermit(
    walletClient,
    hookAddress,
    chainId,
    user,
    deadline,
    nonce,
    isAdd
  );

  const hookData = encodeHookData({
    user,
    deadline,
    nonce,
    signature,
  });

  return hookData;
}

// ============ 错误处理 ============

export class EIP712SigningError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'EIP712SigningError';
  }
}

/**
 * 安全签名包装器（带错误处理）
 */
export async function safeSignSwapPermit(
  walletClient: WalletClient,
  hookAddress: Address,
  chainId: number,
  user: Address,
  deadline: bigint,
  nonce: bigint
): Promise<{ signature?: Hex; error?: string }> {
  try {
    const signature = await signSwapPermit(
      walletClient,
      hookAddress,
      chainId,
      user,
      deadline,
      nonce
    );

    return { signature };
  } catch (error) {
    console.error('EIP-712 signing failed:', error);

    // 用户拒绝签名
    if (error instanceof Error && error.message.includes('rejected')) {
      return { error: 'User rejected signature' };
    }

    // 其他错误
    return { error: 'Failed to generate signature' };
  }
}

/**
 * 验证签名过期时间
 */
export function isDeadlineExpired(deadline: bigint): boolean {
  return BigInt(Math.floor(Date.now() / 1000)) > deadline;
}

/**
 * 计算剩余时间（秒）
 */
export function getRemainingTime(deadline: bigint): bigint {
  const now = BigInt(Math.floor(Date.now() / 1000));
  return deadline > now ? deadline - now : 0n;
}
