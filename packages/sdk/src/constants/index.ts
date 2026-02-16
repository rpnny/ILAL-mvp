/**
 * 常量统一导出
 */

export * from './addresses';
export * from './abis';

// 常用常量
export const DEFAULT_SLIPPAGE_TOLERANCE = 0.5; // 0.5%
export const DEFAULT_DEADLINE_MINUTES = 20; // 20 分钟
export const DEFAULT_SESSION_DURATION = 24 * 3600; // 24 小时（秒）

// Uniswap V4 常量
export const MIN_SQRT_PRICE = BigInt('4295128739');
export const MAX_SQRT_PRICE = BigInt('1461446703485210103287273052203988822378723970342');
export const MIN_TICK = -887272;
export const MAX_TICK = 887272;

// Gas 限制
export const DEFAULT_GAS_LIMIT = {
  SWAP: 300000n,
  ADD_LIQUIDITY: 400000n,
  REMOVE_LIQUIDITY: 350000n,
  ACTIVATE_SESSION: 150000n,
} as const;
