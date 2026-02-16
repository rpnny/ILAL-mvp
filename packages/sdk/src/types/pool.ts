/**
 * Pool 和 Liquidity 特定类型
 */

import type { Address } from 'viem';
import type { PoolKey } from './contracts';

export interface Pool {
  id: string;
  poolKey: PoolKey;
  sqrtPriceX96: bigint;
  tick: number;
  liquidity: bigint;
  feeGrowthGlobal0X128: bigint;
  feeGrowthGlobal1X128: bigint;
}

export interface Position {
  tokenId: bigint;
  poolKey: PoolKey;
  tickLower: number;
  tickUpper: number;
  liquidity: bigint;
  feeGrowthInside0LastX128: bigint;
  feeGrowthInside1LastX128: bigint;
  tokensOwed0: bigint;
  tokensOwed1: bigint;
}

export interface TickInfo {
  liquidityGross: bigint;
  liquidityNet: bigint;
  feeGrowthOutside0X128: bigint;
  feeGrowthOutside1X128: bigint;
  initialized: boolean;
}

export interface LiquidityRange {
  tickLower: number;
  tickUpper: number;
  amount0: bigint;
  amount1: bigint;
}
