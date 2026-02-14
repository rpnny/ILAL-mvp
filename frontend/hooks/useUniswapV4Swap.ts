/**
 * Uniswap v4 真实 Swap Hook
 * 直接与 PoolManager 交互执行 Swap
 */

'use client';

import { useState, useCallback } from 'react';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { type Address, type Hex, parseUnits, formatUnits, encodeAbiParameters } from 'viem';
import { useSession } from './useSession';
import { getContractAddresses } from '@/lib/contracts';
import {
  type PoolKey,
  type SwapParams,
  POOL_MANAGER_ABI,
  UNISWAP_V4_ADDRESSES,
  createPoolKey,
  buildSwapParams,
  getPoolId,
  getPoolStateSlot,
  decodeSlot0,
  sqrtPriceX96ToPrice,
} from '@/lib/uniswap-v4';
import { default as simpleSwapRouterABI } from '@/lib/abis/SimpleSwapRouter.json';

// ============ 类型定义 ============

export interface UniswapV4SwapParams {
  tokenIn: Address;
  tokenOut: Address;
  amountIn: string;
  slippageBps: number;
  deadline: bigint;
  hookData: Hex;
}

export interface SwapResult {
  success: boolean;
  txHash?: Hex;
  amountOut?: bigint;
  error?: string;
}

export type SwapStatus = 'idle' | 'preparing' | 'approving' | 'swapping' | 'confirming' | 'success' | 'error';

// ============ ERC20 ABI（用于授权） ============

const ERC20_ABI = [
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'decimals',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
] as const;

// ============ Hook 实现 ============

export function useUniswapV4Swap() {
  const { address, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { isActive } = useSession();

  const [status, setStatus] = useState<SwapStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<Hex | null>(null);

  const addresses = chainId ? getContractAddresses(chainId) : null;

  /**
   * 检查并授权 Token
   */
  const checkAndApprove = useCallback(
    async (token: Address, amount: bigint): Promise<boolean> => {
      if (!address || !publicClient || !walletClient) return false;

      try {
        // 检查当前授权额度
        const allowance = (await publicClient.readContract({
          address: token,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [address, UNISWAP_V4_ADDRESSES.poolManager],
        })) as bigint;

        if (allowance >= amount) {
          console.log('[Approve] 授权额度充足');
          return true;
        }

        setStatus('approving');
        console.log('[Approve] 需要授权...', {
          token,
          amount: amount.toString(),
          current: allowance.toString(),
        });

        // 授权
        const hash = await walletClient.writeContract({
          address: token,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [UNISWAP_V4_ADDRESSES.poolManager, amount],
        });

        console.log('[Approve] 授权交易已提交:', hash);

        // 等待确认
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        if (receipt.status === 'success') {
          console.log('[Approve] 授权成功');
          return true;
        } else {
          throw new Error('授权交易失败');
        }
      } catch (err) {
        console.error('[Approve] 授权失败:', err);
        setError(err instanceof Error ? err.message : 'Approval failed');
        return false;
      }
    },
    [address, publicClient, walletClient]
  );

  /**
   * 获取池子当前状态
   */
  const getPoolState = useCallback(
    async (poolKey: PoolKey) => {
      if (!publicClient) return null;

      try {
        const poolId = getPoolId(poolKey);

        const stateSlot = getPoolStateSlot(poolId);
        const rawSlot0 = await publicClient.readContract({
          address: UNISWAP_V4_ADDRESSES.poolManager,
          abi: POOL_MANAGER_ABI,
          functionName: 'extsload',
          args: [stateSlot],
        });

        return decodeSlot0(rawSlot0 as `0x${string}`);
      } catch (err) {
        console.error('[Pool] 获取池子状态失败:', err);
        return null;
      }
    },
    [publicClient]
  );

  /**
   * 执行 Swap
   */
  const swap = useCallback(
    async (params: UniswapV4SwapParams): Promise<SwapResult> => {
      if (!address || !walletClient || !publicClient || !addresses) {
        return {
          success: false,
          error: 'Please connect your wallet',
        };
      }

      if (!isActive) {
        return {
          success: false,
          error: 'Please complete identity verification first',
        };
      }

      setStatus('preparing');
      setError(null);
      setTxHash(null);

      try {
        // 1. 创建 PoolKey
        const poolKey = createPoolKey(
          params.tokenIn,
          params.tokenOut,
          3000, // 0.3% fee
          60, // tick spacing
          addresses.complianceHook as Address
        );

        console.log('[Swap] PoolKey:', poolKey);

        // 2. 确定交易方向
        const zeroForOne = params.tokenIn.toLowerCase() === poolKey.currency0.toLowerCase();

        // 3. 解析输入金额
        const tokenInDecimals = (await publicClient.readContract({
          address: params.tokenIn,
          abi: ERC20_ABI,
          functionName: 'decimals',
        })) as number;

        const amountIn = parseUnits(params.amountIn, tokenInDecimals);

        console.log('[Swap] Amount In:', {
          raw: params.amountIn,
          parsed: amountIn.toString(),
          decimals: tokenInDecimals,
        });

        // 4. 授权（如果需要）
        const approved = await checkAndApprove(params.tokenIn, amountIn);
        if (!approved) {
          throw new Error('Token approval failed');
        }

        // 5. 构建 Swap 参数
        const swapParams = buildSwapParams(amountIn, zeroForOne, params.slippageBps);

        console.log('[Swap] Swap Params:', {
          zeroForOne,
          amountSpecified: swapParams.amountSpecified.toString(),
          sqrtPriceLimitX96: swapParams.sqrtPriceLimitX96.toString(),
        });

        // 6. 执行 Swap
        setStatus('swapping');

        // 注意：由于 Uniswap v4 的 swap 需要通过 unlock 机制
        // 这里我们需要使用一个中间合约或者 multicall
        // 为了简化，我们直接调用 PoolManager.swap
        // 实际生产环境应该使用 Router 合约

        // 使用 SimpleSwapRouter 而不是直接调用 PoolManager
        const hash = await walletClient.writeContract({
          address: addresses.simpleSwapRouter as Address,
          abi: simpleSwapRouterABI,
          functionName: 'swap',
          args: [poolKey, swapParams, params.hookData],
        });

        setTxHash(hash);
        setStatus('confirming');

        console.log('[Swap] 交易已提交:', hash);

        // 7. 等待确认
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        if (receipt.status === 'success') {
          setStatus('success');
          console.log('[Swap] 交易成功:', hash);

          // 从 logs 中解析输出金额
          // TODO: 解析 Swap 事件获取实际输出金额

          return {
            success: true,
            txHash: hash,
          };
        } else {
          throw new Error('Transaction failed');
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Transaction failed';
        console.error('[Swap] 错误:', err);
        setError(msg);
        setStatus('error');

        return {
          success: false,
          error: msg,
        };
      }
    },
    [address, walletClient, publicClient, addresses, isActive, checkAndApprove]
  );

  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setTxHash(null);
  }, []);

  return {
    swap,
    status,
    error,
    txHash,
    reset,
    getPoolState,
  };
}
