/**
 * Uniswap v4 集成工具函数
 * 用于与 PoolManager 和 Hooks 交互
 */

import { type Address, type Hex, encodeAbiParameters, keccak256, encodePacked } from 'viem';

// ============ 类型定义 ============

export interface PoolKey {
  currency0: Address;
  currency1: Address;
  fee: number;
  tickSpacing: number;
  hooks: Address;
}

export interface SwapParams {
  zeroForOne: boolean; // true = token0 -> token1
  amountSpecified: bigint; // 负数表示精确输入，正数表示精确输出
  sqrtPriceLimitX96: bigint; // 价格限制（用于滑点保护）
}

// ============ 常量 ============

// Uniswap v4 Base Sepolia 地址
export const UNISWAP_V4_ADDRESSES = {
  poolManager: '0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408' as Address,
  // 注意：Uniswap v4 没有传统的 Router，需要直接与 PoolManager 交互
  // 或者使用自定义的 Router 合约
};

// 最大/最小价格限制 (sqrtPriceX96)
export const MIN_SQRT_PRICE = BigInt('4295128739'); // sqrt(2^-128) * 2^96
export const MAX_SQRT_PRICE = BigInt('1461446703485210103287273052203988822378723970342'); // sqrt(2^128) * 2^96

// ============ PoolKey 编码 ============

/**
 * 计算 PoolKey 的哈希（Pool ID）
 */
export function getPoolId(poolKey: PoolKey): Hex {
  const encoded = encodeAbiParameters(
    [
      { type: 'address', name: 'currency0' },
      { type: 'address', name: 'currency1' },
      { type: 'uint24', name: 'fee' },
      { type: 'int24', name: 'tickSpacing' },
      { type: 'address', name: 'hooks' },
    ],
    [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]
  );
  return keccak256(encoded);
}

/**
 * 创建 PoolKey 对象
 */
export function createPoolKey(
  token0: Address,
  token1: Address,
  fee: number,
  tickSpacing: number,
  hooks: Address
): PoolKey {
  // 确保 token0 < token1
  const [currency0, currency1] =
    token0.toLowerCase() < token1.toLowerCase() ? [token0, token1] : [token1, token0];

  return {
    currency0,
    currency1,
    fee,
    tickSpacing,
    hooks,
  };
}

// ============ Swap 参数构建 ============

/**
 * 构建 Swap 参数
 * @param amountIn 输入金额（精确输入模式）
 * @param zeroForOne 交易方向
 * @param slippageBps 滑点保护（基点，例如 50 = 0.5%）
 */
export function buildSwapParams(
  amountIn: bigint,
  zeroForOne: boolean,
  slippageBps: number = 50
): SwapParams {
  // 精确输入：amountSpecified 为负数
  const amountSpecified = -BigInt(amountIn.toString());

  // 计算价格限制（简化：使用最大/最小值）
  const sqrtPriceLimitX96 = zeroForOne ? MIN_SQRT_PRICE + BigInt(1) : MAX_SQRT_PRICE - BigInt(1);

  return {
    zeroForOne,
    amountSpecified,
    sqrtPriceLimitX96,
  };
}

// ============ PoolManager ABI（部分） ============

export const POOL_MANAGER_ABI = [
  {
    type: 'function',
    name: 'swap',
    inputs: [
      {
        name: 'key',
        type: 'tuple',
        components: [
          { name: 'currency0', type: 'address' },
          { name: 'currency1', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'tickSpacing', type: 'int24' },
          { name: 'hooks', type: 'address' },
        ],
      },
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'zeroForOne', type: 'bool' },
          { name: 'amountSpecified', type: 'int256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
      },
      { name: 'hookData', type: 'bytes' },
    ],
    outputs: [
      {
        name: 'delta',
        type: 'tuple',
        components: [
          { name: 'amount0', type: 'int128' },
          { name: 'amount1', type: 'int128' },
        ],
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'unlock',
    inputs: [{ name: 'data', type: 'bytes' }],
    outputs: [{ name: 'result', type: 'bytes' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getSlot0',
    inputs: [{ name: 'poolId', type: 'bytes32' }],
    outputs: [
      {
        name: 'slot0',
        type: 'tuple',
        components: [
          { name: 'sqrtPriceX96', type: 'uint160' },
          { name: 'tick', type: 'int24' },
          { name: 'protocolFee', type: 'uint24' },
          { name: 'lpFee', type: 'uint24' },
        ],
      },
    ],
    stateMutability: 'view',
  },
] as const;

// ============ 价格计算 ============

/**
 * 从 sqrtPriceX96 计算人类可读的价格
 * price = (sqrtPriceX96 / 2^96)^2
 */
export function sqrtPriceX96ToPrice(sqrtPriceX96: bigint, decimals0: number, decimals1: number): number {
  const Q96 = BigInt(2) ** BigInt(96);
  const sqrtPrice = Number(sqrtPriceX96) / Number(Q96);
  const price = sqrtPrice ** 2;
  
  // 调整精度
  const decimalAdjustment = 10 ** (decimals1 - decimals0);
  return price * decimalAdjustment;
}

/**
 * 从人类可读的价格计算 sqrtPriceX96
 */
export function priceToSqrtPriceX96(price: number, decimals0: number, decimals1: number): bigint {
  const decimalAdjustment = 10 ** (decimals1 - decimals0);
  const adjustedPrice = price / decimalAdjustment;
  const sqrtPrice = Math.sqrt(adjustedPrice);
  const Q96 = BigInt(2) ** BigInt(96);
  return BigInt(Math.floor(sqrtPrice * Number(Q96)));
}

// ============ Tick 数学 ============

/**
 * 从 tick 计算价格
 * price = 1.0001^tick
 */
export function tickToPrice(tick: number, decimals0: number, decimals1: number): number {
  const price = 1.0001 ** tick;
  const decimalAdjustment = 10 ** (decimals1 - decimals0);
  return price * decimalAdjustment;
}

/**
 * 从价格计算 tick
 * tick = log(price) / log(1.0001)
 */
export function priceToTick(price: number, decimals0: number, decimals1: number): number {
  const decimalAdjustment = 10 ** (decimals1 - decimals0);
  const adjustedPrice = price / decimalAdjustment;
  return Math.floor(Math.log(adjustedPrice) / Math.log(1.0001));
}

// ============ 输出金额估算 ============

/**
 * 估算 swap 输出金额（简化版本）
 * 注意：这是近似计算，实际金额会受价格影响和滑点影响
 */
export function estimateSwapOutput(
  amountIn: bigint,
  currentPrice: number,
  feeBps: number
): bigint {
  // 扣除手续费
  const feeAmount = (amountIn * BigInt(feeBps)) / BigInt(10000);
  const amountAfterFee = amountIn - feeAmount;

  // 简化：假设价格不变（实际会有价格影响）
  const output = (amountAfterFee * BigInt(Math.floor(currentPrice * 1e6))) / BigInt(1e6);

  return output;
}

// ============ 工具函数 ============

/**
 * 检查地址是否为 ETH (零地址)
 */
export function isETH(address: Address): boolean {
  return address === '0x0000000000000000000000000000000000000000';
}

/**
 * 格式化 PoolKey 为字符串（用于日志）
 */
export function formatPoolKey(poolKey: PoolKey): string {
  return `${poolKey.currency0}/${poolKey.currency1}/${poolKey.fee}`;
}
