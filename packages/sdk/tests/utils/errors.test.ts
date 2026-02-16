/**
 * 错误类测试
 */

import { describe, it, expect } from 'vitest';
import {
  SessionExpiredError,
  InsufficientLiquidityError,
  SlippageExceededError,
  InvalidProofError,
} from '../../src/utils/errors';

describe('错误类', () => {
  describe('SessionExpiredError', () => {
    it('应该正确创建错误实例', () => {
      const error = new SessionExpiredError({
        user: '0x1234567890123456789012345678901234567890',
      });

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('SessionExpiredError');
      expect(error.message).toContain('Session expired or inactive');
    });
  });

  describe('InsufficientLiquidityError', () => {
    it('应该包含交易参数', () => {
      const params = {
        tokenIn: '0xUSDC',
        tokenOut: '0xWETH',
        amountIn: 100n,
      };

      const error = new InsufficientLiquidityError({ params });

      expect(error.name).toBe('ILALError');
      expect(error.message).toContain('Insufficient liquidity');
    });
  });

  describe('SlippageExceededError', () => {
    it('应该包含滑点信息', () => {
      const error = new SlippageExceededError({
        params: {
          tokenIn: '0xUSDC',
          tokenOut: '0xWETH',
          amountIn: 100n,
          slippageTolerance: 0.5,
        },
      });

      expect(error.name).toBe('ILALError');
      expect(error.message).toContain('Slippage tolerance exceeded');
    });
  });

  describe('InvalidProofError', () => {
    it('应该包含输入数据', () => {
      const input = {
        userAddress: '0x1234',
        merkleRoot: '0xabcd',
      };

      const error = new InvalidProofError({ input });

      expect(error.name).toBe('ILALError');
      expect(error.message).toContain('Invalid ZK proof');
    });
  });
});
