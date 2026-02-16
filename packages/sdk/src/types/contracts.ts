/**
 * 合约特定类型定义
 */

import type { Address } from 'viem';

// Uniswap V4 Pool 相关
export interface PoolKey {
  currency0: Address;
  currency1: Address;
  fee: number;
  tickSpacing: number;
  hooks: Address;
}

export interface BalanceDelta {
  amount0: bigint;
  amount1: bigint;
}

export interface ModifyLiquidityParams {
  tickLower: number;
  tickUpper: number;
  liquidityDelta: bigint;
}

export interface SwapParams {
  zeroForOne: boolean;
  amountSpecified: bigint;
  sqrtPriceLimitX96: bigint;
}
