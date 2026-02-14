/**
 * Uniswap v4 池子价格 Hook
 * 从链上读取真实价格数据
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePublicClient, useChainId } from 'wagmi';
import { type Address } from 'viem';
import {
  type PoolKey,
  POOL_MANAGER_ABI,
  UNISWAP_V4_ADDRESSES,
  createPoolKey,
  getPoolId,
  getPoolStateSlot,
  decodeSlot0,
  sqrtPriceX96ToPrice,
  tickToPrice,
} from '@/lib/uniswap-v4';
import { getContractAddresses } from '@/lib/contracts';

// ============ 类型定义 ============

export interface PoolPrice {
  price: number; // token1 / token0 的价格
  tick: number;
  sqrtPriceX96: bigint;
  invertedPrice: number; // token0 / token1 的价格
  loading: boolean;
  error: string | null;
}

export interface UsePoolPriceParams {
  token0: Address;
  token1: Address;
  token0Decimals: number;
  token1Decimals: number;
  fee?: number; // 默认 3000 (0.3%)
  refreshInterval?: number; // 刷新间隔（毫秒），默认 30000 (30秒)
}

// ============ Hook 实现 ============

export function usePoolPrice(params: UsePoolPriceParams): PoolPrice {
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const addresses = chainId ? getContractAddresses(chainId) : null;

  const [price, setPrice] = useState<number>(0);
  const [tick, setTick] = useState<number>(0);
  const [sqrtPriceX96, setSqrtPriceX96] = useState<bigint>(0n);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fee = params.fee || 10000;  // 默认使用活跃 Pool (fee=10000)
  const refreshInterval = params.refreshInterval || 30000;

  /**
   * 从链上获取价格
   */
  const fetchPrice = useCallback(async () => {
    if (!publicClient || !addresses) {
      setError('Not connected to network');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. 创建 PoolKey
      const poolKey = createPoolKey(
        params.token0,
        params.token1,
        fee,
        fee === 10000 ? 200 : 10, // tickSpacing: 10000→200, 500→10
        addresses.complianceHook as Address
      );

      // 2. 获取 Pool ID
      const poolId = getPoolId(poolKey);

      // 3. 计算存储槽位并通过 extsload 读取
      //    Uniswap v4 的 getSlot0 不是外部函数，需要用 extsload 读取存储
      const stateSlot = getPoolStateSlot(poolId);

      const rawSlot0 = await publicClient.readContract({
        address: UNISWAP_V4_ADDRESSES.poolManager,
        abi: POOL_MANAGER_ABI,
        functionName: 'extsload',
        args: [stateSlot],
      });

      // 4. 解码 Slot0 数据
      const slot0 = decodeSlot0(rawSlot0 as `0x${string}`);

      if (slot0.sqrtPriceX96 === 0n) {
        throw new Error('Pool not initialized (sqrtPriceX96 = 0)');
      }

      // 5. 计算人类可读的价格
      const readablePrice = sqrtPriceX96ToPrice(
        slot0.sqrtPriceX96,
        params.token0Decimals,
        params.token1Decimals
      );

      // 6. 更新状态
      setPrice(readablePrice);
      setTick(slot0.tick);
      setSqrtPriceX96(slot0.sqrtPriceX96);
      setLoading(false);

      console.log('[PoolPrice] 价格更新 (via extsload):', {
        price: readablePrice,
        tick: slot0.tick,
        lpFee: slot0.lpFee,
        sqrtPriceX96: slot0.sqrtPriceX96.toString(),
      });
    } catch (err) {
      console.error('[PoolPrice] 获取价格失败:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch price';
      setError(errorMsg);
      setLoading(false);
    }
  }, [publicClient, addresses, params, fee]);

  /**
   * 初始加载和定时刷新
   * 修复：使用直接依赖而不是 fetchPrice callback，避免无限循环
   */
  useEffect(() => {
    fetchPrice();

    // 设置定时刷新
    const interval = setInterval(() => {
      fetchPrice();
    }, refreshInterval);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicClient, addresses, params.token0, params.token1, params.token0Decimals, params.token1Decimals, fee, refreshInterval]);

  return {
    price,
    tick,
    sqrtPriceX96,
    invertedPrice: price > 0 ? 1 / price : 0,
    loading,
    error,
  };
}

/**
 * 计算 Swap 输出金额
 */
export function useCalculateSwapOutput() {
  const calculateOutput = useCallback(
    (
      amountIn: string,
      priceData: PoolPrice,
      fromToken: 'token0' | 'token1',
      feeBps: number = 30 // 0.3%
    ): { output: string; priceImpact: string } => {
      if (!amountIn || parseFloat(amountIn) <= 0 || priceData.price === 0) {
        return { output: '0', priceImpact: '0' };
      }

      try {
        const input = parseFloat(amountIn);
        
        // 扣除手续费
        const feeAmount = (input * feeBps) / 10000;
        const amountAfterFee = input - feeAmount;

        // 根据方向计算输出
        let output: number;
        if (fromToken === 'token0') {
          // token0 -> token1
          output = amountAfterFee * priceData.price;
        } else {
          // token1 -> token0
          output = amountAfterFee * priceData.invertedPrice;
        }

        // 价格影响（简化计算）
        // 实际应该考虑流动性深度
        const priceImpact = (input / 1000000) * 100; // 假设：每 100万 导致 1% 影响

        return {
          output: output.toFixed(6),
          priceImpact: Math.min(priceImpact, 100).toFixed(2),
        };
      } catch (err) {
        console.error('[Calculate] 计算输出失败:', err);
        return { output: '0', priceImpact: '0' };
      }
    },
    []
  );

  return calculateOutput;
}

/**
 * 获取多个池子的价格
 */
export function useMultiplePoolPrices(pools: UsePoolPriceParams[]): PoolPrice[] {
  return pools.map((poolParams) => usePoolPrice(poolParams));
}
