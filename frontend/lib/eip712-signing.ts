/**
 * ILAL EIP-712 签名工具
 * 用于在前端生成 ComplianceHook 所需的签名
 */

import { ethers } from 'ethers';

// ============ 类型定义 ============

export interface SwapPermit {
  user: string;
  deadline: bigint;
  nonce: bigint;
}

export interface LiquidityPermit extends SwapPermit {
  isAdd: boolean;
}

export interface SignedPermit {
  user: string;
  deadline: bigint;
  nonce: bigint;
  signature: string;
}

// ============ EIP-712 域 ============

export function getDomain(chainId: number, hookAddress: string) {
  return {
    name: 'ILAL ComplianceHook',
    version: '1',
    chainId,
    verifyingContract: hookAddress,
  };
}

// ============ EIP-712 类型 ============

export const SWAP_PERMIT_TYPES = {
  SwapPermit: [
    { name: 'user', type: 'address' },
    { name: 'deadline', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
  ],
};

export const LIQUIDITY_PERMIT_TYPES = {
  LiquidityPermit: [
    { name: 'user', type: 'address' },
    { name: 'deadline', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'isAdd', type: 'bool' },
  ],
};

// ============ 签名函数 ============

/**
 * 为 Swap 生成 EIP-712 签名
 * @param signer ethers.Signer 实例
 * @param hookAddress ComplianceHook 合约地址
 * @param chainId 链 ID (Base Mainnet = 8453)
 * @param user 用户地址
 * @param deadline 签名过期时间戳
 * @param nonce 用户当前 nonce
 * @returns 签名字符串
 */
export async function signSwapPermit(
  signer: ethers.Signer,
  hookAddress: string,
  chainId: number,
  user: string,
  deadline: bigint,
  nonce: bigint
): Promise<string> {
  const domain = getDomain(chainId, hookAddress);

  const permit: SwapPermit = {
    user,
    deadline,
    nonce,
  };

  // 使用 ethers.js v6 的 signTypedData
  const signature = await signer.signTypedData(
    domain,
    SWAP_PERMIT_TYPES,
    permit
  );

  return signature;
}

/**
 * 为流动性操作生成 EIP-712 签名
 */
export async function signLiquidityPermit(
  signer: ethers.Signer,
  hookAddress: string,
  chainId: number,
  user: string,
  deadline: bigint,
  nonce: bigint,
  isAdd: boolean
): Promise<string> {
  const domain = getDomain(chainId, hookAddress);

  const permit: LiquidityPermit = {
    user,
    deadline,
    nonce,
    isAdd,
  };

  const signature = await signer.signTypedData(
    domain,
    LIQUIDITY_PERMIT_TYPES,
    permit
  );

  return signature;
}

// ============ 编码 hookData ============

/**
 * 编码 hookData 用于合约调用
 * @param permit 签名的许可数据
 * @returns 编码后的 bytes
 */
export function encodeHookData(permit: SignedPermit): string {
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();

  return abiCoder.encode(
    ['address', 'uint256', 'uint256', 'bytes'],
    [permit.user, permit.deadline, permit.nonce, permit.signature]
  );
}

// ============ 辅助函数 ============

/**
 * 获取默认 deadline (当前时间 + 10 分钟)
 */
export function getDefaultDeadline(): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + 600);
}

/**
 * 从合约读取用户当前 nonce
 */
export async function getNonce(
  provider: ethers.Provider,
  hookAddress: string,
  userAddress: string
): Promise<bigint> {
  const hook = new ethers.Contract(
    hookAddress,
    ['function getNonce(address) view returns (uint256)'],
    provider
  );

  return await hook.getNonce(userAddress);
}

// ============ 完整流程示例 ============

/**
 * 完整签名流程：获取 nonce -> 签名 -> 编码
 */
export async function createSignedSwapPermit(
  signer: ethers.Signer,
  provider: ethers.Provider,
  hookAddress: string,
  chainId: number
): Promise<string> {
  // 1. 获取用户地址
  const userAddress = await signer.getAddress();

  // 2. 获取当前 nonce
  const nonce = await getNonce(provider, hookAddress, userAddress);

  // 3. 设置 deadline
  const deadline = getDefaultDeadline();

  // 4. 生成签名
  const signature = await signSwapPermit(
    signer,
    hookAddress,
    chainId,
    userAddress,
    deadline,
    nonce
  );

  // 5. 编码 hookData
  const hookData = encodeHookData({
    user: userAddress,
    deadline,
    nonce,
    signature,
  });

  return hookData;
}

// ============ React Hook 示例 ============

/**
 * 使用示例 (React + wagmi)
 * 
 * ```typescript
 * import { useWalletClient } from 'wagmi';
 * import { createSignedSwapPermit } from '@/lib/eip712-signing';
 * 
 * function SwapButton() {
 *   const { data: walletClient } = useWalletClient();
 * 
 *   async function handleSwap() {
 *     if (!walletClient) return;
 * 
 *     // 生成签名的 hookData
 *     const hookData = await createSignedSwapPermit(
 *       walletClient,
 *       provider,
 *       HOOK_ADDRESS,
 *       8453 // Base Mainnet
 *     );
 * 
 *     // 调用 swap (通过 Universal Router)
 *     await router.execute([
 *       {
 *         command: 'V4_SWAP',
 *         inputs: ethers.AbiCoder.defaultAbiCoder().encode(
 *           ['bytes'], // hookData 参数
 *           [hookData]
 *         )
 *       }
 *     ]);
 *   }
 * 
 *   return <button onClick={handleSwap}>Swap</button>;
 * }
 * ```
 */

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
  signer: ethers.Signer,
  hookAddress: string,
  chainId: number,
  user: string,
  deadline: bigint,
  nonce: bigint
): Promise<{ signature?: string; error?: string }> {
  try {
    const signature = await signSwapPermit(
      signer,
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
    if (error instanceof Error && error.message.includes('user rejected')) {
      return { error: 'User rejected signature' };
    }

    // 其他错误
    return { error: 'Failed to generate signature' };
  }
}
