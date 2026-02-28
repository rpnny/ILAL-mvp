/**
 * 编码和解码工具函数
 */

import type { Address, Hex } from 'viem';
import { encodeAbiParameters, decodeAbiParameters, parseAbiParameters, encodePacked, concat, pad } from 'viem';
import type { PoolKey } from '../types';

// ============================================================
// ComplianceHook — hookData 编码工具
// ============================================================
//
// ComplianceHook._resolveUser 支持三种模式，由 hookData 长度决定：
//
//   Mode 0 (EIP-712)：hookData.length >= 85
//     格式: abi.encode(address user, uint256 deadline, uint256 nonce, bytes sig)
//     适用: DApp 前端让用户签名授权再由路由器代转
//
//   Mode 1 (直接调用)：hookData.length == 0
//     格式: 0x（空）
//     适用: EOA 直接调用路由器，msg.sender 即为用户
//
//   Mode 2 (白名单路由器转发)：hookData.length == 20
//     格式: bytes20(userAddress)，右填充到 20 字节
//     适用: 受信路由器代替用户发起调用，地址必须已在 Registry.approveRouter()
//
// 请勿在其他地方手动构造 hookData，统一使用以下工厂函数。
// ============================================================

/**
 * Mode 2 — 白名单路由器转发
 * 将用户地址右填充到 20 字节后传入 hookData。
 * 要求调用合约（msg.sender）已在 Registry 注册为受信路由器。
 */
export function encodeRouterHookData(userAddress: Address): Hex {
  return pad(userAddress, { dir: 'right', size: 20 });
}

/**
 * Mode 0 — EIP-712 授权签名
 * 编码用户地址、deadline、nonce 和 65-byte 签名。
 */
export function encodeEip712HookData(
  user: Address,
  deadline: bigint,
  nonce: bigint,
  signature: Hex
): Hex {
  return encodeAbiParameters(
    parseAbiParameters('address, uint256, uint256, bytes'),
    [user, deadline, nonce, signature]
  );
}

/**
 * Mode 1 — 直接调用（空 hookData）
 * 适用于 EOA 直接作为 msg.sender 调用路由器。
 */
export const DIRECT_HOOK_DATA: Hex = '0x';


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
