/**
 * Swap 模块测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SwapModule } from '../../src/modules/swap';
import { createMockWalletClient, createMockPublicClient } from '../mockData/clients';
import { MOCK_ADDRESSES, MOCK_TOKEN_ADDRESSES, MOCK_TX_HASH } from '../mockData/contracts';
import { parseUnits } from 'viem';

describe('SwapModule', () => {
  let swapModule: SwapModule;
  let mockWalletClient: any;
  let mockPublicClient: any;

  beforeEach(() => {
    mockWalletClient = createMockWalletClient();
    mockPublicClient = createMockPublicClient();

    mockPublicClient.readContract = vi.fn();
    mockWalletClient.writeContract = vi.fn();
    mockPublicClient.waitForTransactionReceipt = vi.fn();

    swapModule = new SwapModule(
      mockWalletClient,
      mockPublicClient,
      MOCK_ADDRESSES.simpleSwapRouter,
      MOCK_ADDRESSES.complianceHook
    );
  });

  describe('execute', () => {
    const validSwapParams = {
      tokenIn: MOCK_TOKEN_ADDRESSES.USDC,
      tokenOut: MOCK_TOKEN_ADDRESSES.WETH,
      amountIn: parseUnits('100', 6),
      slippageTolerance: 0.5,
    };

    it('应该成功执行 Swap', async () => {
      const mockReceipt = {
        transactionHash: MOCK_TX_HASH,
        gasUsed: 200000n,
        status: 'success',
      };

      mockWalletClient.writeContract.mockResolvedValue(MOCK_TX_HASH);
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue(mockReceipt);
      mockPublicClient.readContract.mockResolvedValue(parseUnits('1000', 6)); // balance

      const result = await swapModule.execute(validSwapParams);

      expect(result.hash).toBe(MOCK_TX_HASH);
      expect(result.gasUsed).toBe(200000n);
      expect(mockWalletClient.writeContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'swap',
        })
      );
    });

    it('参数无效时应该抛出错误', async () => {
      const invalidParams = {
        ...validSwapParams,
        amountIn: 0n, // 无效金额
      };

      await expect(swapModule.execute(invalidParams as any)).rejects.toThrow();
    });

    it('应该正确处理代币顺序', async () => {
      mockWalletClient.writeContract.mockResolvedValue(MOCK_TX_HASH);
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue({
        transactionHash: MOCK_TX_HASH,
        gasUsed: 200000n,
      });
      mockPublicClient.readContract.mockResolvedValue(parseUnits('1000', 6));

      await swapModule.execute(validSwapParams);

      const callArgs = mockWalletClient.writeContract.mock.calls[0][0];
      const poolKey = callArgs.args[0];

      // 验证代币顺序（USDC < WETH）
      expect(poolKey.currency0 < poolKey.currency1).toBe(true);
    });
  });

  describe('getBalance', () => {
    it('应该返回代币余额', async () => {
      const mockBalance = parseUnits('1000', 6);
      mockPublicClient.readContract.mockResolvedValue(mockBalance);

      const balance = await swapModule.getBalance(MOCK_TOKEN_ADDRESSES.USDC);

      expect(balance).toBe(mockBalance);
      expect(mockPublicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'balanceOf',
        })
      );
    });
  });
});
