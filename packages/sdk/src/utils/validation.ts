/**
 * 输入验证工具函数
 */

import type { Address } from 'viem';
import { isAddress } from 'viem';
import type { SwapParams, LiquidityParams, PoolKey } from '../types';
import { MIN_TICK, MAX_TICK } from '../constants';

/**
 * 验证地址格式
 */
export function validateAddress(address: string): address is Address {
  return isAddress(address);
}

/**
 * 验证 Swap 参数
 */
export function validateSwapParams(params: SwapParams): { valid: boolean; error?: string } {
  if (!validateAddress(params.tokenIn)) {
    return { valid: false, error: 'Invalid tokenIn address' };
  }

  if (!validateAddress(params.tokenOut)) {
    return { valid: false, error: 'Invalid tokenOut address' };
  }

  if (params.tokenIn === params.tokenOut) {
    return { valid: false, error: 'tokenIn and tokenOut must be different' };
  }

  if (params.amountIn <= 0n) {
    return { valid: false, error: 'amountIn must be greater than 0' };
  }

  if (params.slippageTolerance !== undefined) {
    if (params.slippageTolerance < 0 || params.slippageTolerance > 100) {
      return { valid: false, error: 'slippageTolerance must be between 0 and 100' };
    }
  }

  if (params.recipient && !validateAddress(params.recipient)) {
    return { valid: false, error: 'Invalid recipient address' };
  }

  return { valid: true };
}

/**
 * 验证流动性参数
 */
export function validateLiquidityParams(params: LiquidityParams): { valid: boolean; error?: string } {
  // 验证 Pool Key
  const poolKeyValidation = validatePoolKey(params.poolKey);
  if (!poolKeyValidation.valid) {
    return poolKeyValidation;
  }

  // 验证 tick 范围
  if (params.tickLower >= params.tickUpper) {
    return { valid: false, error: 'tickLower must be less than tickUpper' };
  }

  if (params.tickLower < MIN_TICK || params.tickLower > MAX_TICK) {
    return { valid: false, error: `tickLower out of bounds: ${MIN_TICK} to ${MAX_TICK}` };
  }

  if (params.tickUpper < MIN_TICK || params.tickUpper > MAX_TICK) {
    return { valid: false, error: `tickUpper out of bounds: ${MIN_TICK} to ${MAX_TICK}` };
  }

  // 验证 tick spacing
  const tickSpacing = params.poolKey.tickSpacing;
  if (params.tickLower % tickSpacing !== 0) {
    return { valid: false, error: `tickLower must be multiple of tickSpacing (${tickSpacing})` };
  }

  if (params.tickUpper % tickSpacing !== 0) {
    return { valid: false, error: `tickUpper must be multiple of tickSpacing (${tickSpacing})` };
  }

  // 验证金额
  if (params.amount0Desired < 0n || params.amount1Desired < 0n) {
    return { valid: false, error: 'Desired amounts must be non-negative' };
  }

  if (params.amount0Min !== undefined && params.amount0Min < 0n) {
    return { valid: false, error: 'amount0Min must be non-negative' };
  }

  if (params.amount1Min !== undefined && params.amount1Min < 0n) {
    return { valid: false, error: 'amount1Min must be non-negative' };
  }

  if (params.recipient && !validateAddress(params.recipient)) {
    return { valid: false, error: 'Invalid recipient address' };
  }

  return { valid: true };
}

/**
 * 验证 Pool Key
 */
export function validatePoolKey(poolKey: PoolKey): { valid: boolean; error?: string } {
  if (!validateAddress(poolKey.currency0)) {
    return { valid: false, error: 'Invalid currency0 address' };
  }

  if (!validateAddress(poolKey.currency1)) {
    return { valid: false, error: 'Invalid currency1 address' };
  }

  if (poolKey.currency0 >= poolKey.currency1) {
    return { valid: false, error: 'currency0 must be less than currency1' };
  }

  if (!validateAddress(poolKey.hooks)) {
    return { valid: false, error: 'Invalid hooks address' };
  }

  if (poolKey.fee < 0) {
    return { valid: false, error: 'fee must be non-negative' };
  }

  if (poolKey.tickSpacing <= 0) {
    return { valid: false, error: 'tickSpacing must be positive' };
  }

  return { valid: true };
}

/**
 * 验证滑点参数并计算价格限制
 */
export function validateAndCalculateSlippage(
  currentPrice: bigint,
  slippageTolerance: number,
  zeroForOne: boolean
): bigint {
  if (slippageTolerance < 0 || slippageTolerance > 100) {
    throw new Error('slippageTolerance must be between 0 and 100');
  }

  const slippageBps = BigInt(Math.floor(slippageTolerance * 100)); // 转换为 basis points
  const multiplier = 10000n;

  if (zeroForOne) {
    // 卖出 token0，价格会下降，设置最小可接受价格
    return (currentPrice * (multiplier - slippageBps)) / multiplier;
  } else {
    // 买入 token0，价格会上升，设置最大可接受价格
    return (currentPrice * (multiplier + slippageBps)) / multiplier;
  }
}

/**
 * 确保地址是小写（checksum 处理）
 */
export function normalizeAddress(address: Address): Address {
  return address.toLowerCase() as Address;
}
