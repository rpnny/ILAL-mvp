/**
 * 验证工具函数测试
 */

import { describe, it, expect } from 'vitest';
import { validateSwapParams } from '../../src/utils/validation';
import { MOCK_TOKEN_ADDRESSES } from '../mockData/contracts';
import { parseUnits } from 'viem';

describe('验证工具函数', () => {
  describe('validateSwapParams', () => {
    it('有效参数应该通过验证', () => {
      const validParams = {
        tokenIn: MOCK_TOKEN_ADDRESSES.USDC,
        tokenOut: MOCK_TOKEN_ADDRESSES.WETH,
        amountIn: parseUnits('100', 6),
      };

      const result = validateSwapParams(validParams);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('金额为 0 应该失败', () => {
      const invalidParams = {
        tokenIn: MOCK_TOKEN_ADDRESSES.USDC,
        tokenOut: MOCK_TOKEN_ADDRESSES.WETH,
        amountIn: 0n,
      };

      const result = validateSwapParams(invalidParams);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('amountIn must be greater than 0');
    });

    it('相同的输入输出代币应该失败', () => {
      const invalidParams = {
        tokenIn: MOCK_TOKEN_ADDRESSES.USDC,
        tokenOut: MOCK_TOKEN_ADDRESSES.USDC,
        amountIn: parseUnits('100', 6),
      };

      const result = validateSwapParams(invalidParams);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('tokenIn and tokenOut must be different');
    });

    it('无效的滑点容忍度应该失败', () => {
      const invalidParams = {
        tokenIn: MOCK_TOKEN_ADDRESSES.USDC,
        tokenOut: MOCK_TOKEN_ADDRESSES.WETH,
        amountIn: parseUnits('100', 6),
        slippageTolerance: 150, // > 100%
      };

      const result = validateSwapParams(invalidParams);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('slippageTolerance must be between 0 and 100');
    });
  });
});
