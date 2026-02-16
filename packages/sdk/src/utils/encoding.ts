/**
 * 编码和解码工具函数
 */

import type { Address, Hex } from 'viem';
import { encodeAbiParameters, decodeAbiParameters, parseAbiParameters, encodePacked } from 'viem';
import type { PoolKey } from '../types';

/**
 * 计算 Pool ID
 */
export function getPoolId(poolKey: PoolKey): Hex {
  return encodePacked(
    ['address', 'address', 'uint24', 'int24', 'address'],
    [
      poolKey.currency0,
      poolKey.currency1,
      poolKey.fee,
      poolKey.tickSpacing,
      poolKey.hooks,
    ]
  );
}

/**
 * 编码 PoolKey 为 ABI 参数
 */
export function encodePoolKey(poolKey: PoolKey): Hex {
  return encodeAbiParameters(
    parseAbiParameters('address, address, uint24, int24, address'),
    [
      poolKey.currency0,
      poolKey.currency1,
      poolKey.fee,
      poolKey.tickSpacing,
      poolKey.hooks,
    ]
  );
}

/**
 * 解码 PoolKey 从 ABI 参数
 */
export function decodePoolKey(data: Hex): PoolKey {
  const [currency0, currency1, fee, tickSpacing, hooks] = decodeAbiParameters(
    parseAbiParameters('address, address, uint24, int24, address'),
    data
  );

  return {
    currency0,
    currency1,
    fee,
    tickSpacing,
    hooks,
  };
}

/**
 * 编码流动性参数
 */
export function encodeModifyLiquidityParams(
  tickLower: number,
  tickUpper: number,
  liquidityDelta: bigint
): Hex {
  return encodeAbiParameters(
    parseAbiParameters('int24, int24, int256'),
    [tickLower, tickUpper, liquidityDelta]
  );
}

/**
 * 编码 Swap 参数
 */
export function encodeSwapParams(
  zeroForOne: boolean,
  amountSpecified: bigint,
  sqrtPriceLimitX96: bigint
): Hex {
  return encodeAbiParameters(
    parseAbiParameters('bool, int256, uint160'),
    [zeroForOne, amountSpecified, sqrtPriceLimitX96]
  );
}

/**
 * 判断代币顺序（哪个是 currency0）
 */
export function sortTokens(tokenA: Address, tokenB: Address): [Address, Address, boolean] {
  const zeroForOne = tokenA < tokenB;
  return zeroForOne ? [tokenA, tokenB, true] : [tokenB, tokenA, false];
}

/**
 * 从 sqrt price 计算实际价格
 */
export function sqrtPriceX96ToPrice(sqrtPriceX96: bigint, decimals0: number, decimals1: number): number {
  const Q96 = 2n ** 96n;
  const price = Number(sqrtPriceX96 * sqrtPriceX96) / Number(Q96 * Q96);
  const decimalAdjustment = 10 ** (decimals1 - decimals0);
  return price * decimalAdjustment;
}

/**
 * 从实际价格计算 sqrt price
 */
export function priceToSqrtPriceX96(price: number, decimals0: number, decimals1: number): bigint {
  const decimalAdjustment = 10 ** (decimals0 - decimals1);
  const adjustedPrice = price * decimalAdjustment;
  const Q96 = 2n ** 96n;
  return BigInt(Math.floor(Math.sqrt(adjustedPrice) * Number(Q96)));
}

/**
 * 从 tick 计算 sqrt price
 */
export function tickToSqrtPriceX96(tick: number): bigint {
  const Q96 = 2n ** 96n;
  const price = 1.0001 ** tick;
  return BigInt(Math.floor(Math.sqrt(price) * Number(Q96)));
}

/**
 * 从 sqrt price 计算 tick
 */
export function sqrtPriceX96ToTick(sqrtPriceX96: bigint): number {
  const Q96 = 2n ** 96n;
  const price = Number(sqrtPriceX96 * sqrtPriceX96) / Number(Q96 * Q96);
  return Math.floor(Math.log(price) / Math.log(1.0001));
}

/**
 * 计算流动性对应的代币数量
 */
export function getLiquidityForAmounts(
  sqrtPriceX96: bigint,
  sqrtPriceAX96: bigint,
  sqrtPriceBX96: bigint,
  amount0: bigint,
  amount1: bigint
): bigint {
  if (sqrtPriceAX96 > sqrtPriceBX96) {
    [sqrtPriceAX96, sqrtPriceBX96] = [sqrtPriceBX96, sqrtPriceAX96];
  }

  if (sqrtPriceX96 <= sqrtPriceAX96) {
    return getLiquidityForAmount0(sqrtPriceAX96, sqrtPriceBX96, amount0);
  } else if (sqrtPriceX96 < sqrtPriceBX96) {
    const liquidity0 = getLiquidityForAmount0(sqrtPriceX96, sqrtPriceBX96, amount0);
    const liquidity1 = getLiquidityForAmount1(sqrtPriceAX96, sqrtPriceX96, amount1);
    return liquidity0 < liquidity1 ? liquidity0 : liquidity1;
  } else {
    return getLiquidityForAmount1(sqrtPriceAX96, sqrtPriceBX96, amount1);
  }
}

function getLiquidityForAmount0(sqrtPriceAX96: bigint, sqrtPriceBX96: bigint, amount0: bigint): bigint {
  if (sqrtPriceAX96 > sqrtPriceBX96) {
    [sqrtPriceAX96, sqrtPriceBX96] = [sqrtPriceBX96, sqrtPriceAX96];
  }
  const intermediate = (sqrtPriceAX96 * sqrtPriceBX96) / (2n ** 96n);
  return (amount0 * intermediate) / (sqrtPriceBX96 - sqrtPriceAX96);
}

function getLiquidityForAmount1(sqrtPriceAX96: bigint, sqrtPriceBX96: bigint, amount1: bigint): bigint {
  if (sqrtPriceAX96 > sqrtPriceBX96) {
    [sqrtPriceAX96, sqrtPriceBX96] = [sqrtPriceBX96, sqrtPriceAX96];
  }
  return (amount1 * (2n ** 96n)) / (sqrtPriceBX96 - sqrtPriceAX96);
}
