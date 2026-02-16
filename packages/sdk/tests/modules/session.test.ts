/**
 * Session 模块测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionModule } from '../../src/modules/session';
import { createMockWalletClient, createMockPublicClient } from '../mockData/clients';
import { MOCK_ADDRESSES, MOCK_USER_ADDRESS } from '../mockData/contracts';

describe('SessionModule', () => {
  let sessionModule: SessionModule;
  let mockWalletClient: any;
  let mockPublicClient: any;

  beforeEach(() => {
    mockWalletClient = createMockWalletClient();
    mockPublicClient = createMockPublicClient();

    // 模拟 readContract 和 writeContract
    mockPublicClient.readContract = vi.fn();
    mockWalletClient.writeContract = vi.fn();
    mockPublicClient.waitForTransactionReceipt = vi.fn();

    sessionModule = new SessionModule(
      mockWalletClient,
      mockPublicClient,
      MOCK_ADDRESSES.sessionManager
    );
  });

  describe('isActive', () => {
    it('应该返回 Session 激活状态', async () => {
      // Mock 返回 true
      mockPublicClient.readContract.mockResolvedValue(true);

      const isActive = await sessionModule.isActive(MOCK_USER_ADDRESS);

      expect(isActive).toBe(true);
      expect(mockPublicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'isSessionActive',
          args: [MOCK_USER_ADDRESS],
        })
      );
    });

    it('Session 未激活时应该返回 false', async () => {
      mockPublicClient.readContract.mockResolvedValue(false);

      const isActive = await sessionModule.isActive(MOCK_USER_ADDRESS);

      expect(isActive).toBe(false);
    });
  });

  describe('getRemainingTime', () => {
    it('应该返回 Session 剩余时间', async () => {
      const mockRemainingTime = 3600n; // 1 小时
      mockPublicClient.readContract.mockResolvedValue(mockRemainingTime);

      const remaining = await sessionModule.getRemainingTime(MOCK_USER_ADDRESS);

      expect(remaining).toBe(mockRemainingTime);
      expect(mockPublicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'getRemainingTime',
        })
      );
    });

    it('Session 不存在时应该返回 0', async () => {
      mockPublicClient.readContract.mockRejectedValue(new Error('Session not found'));

      const remaining = await sessionModule.getRemainingTime(MOCK_USER_ADDRESS);

      expect(remaining).toBe(0n);
    });
  });

  describe('getInfo', () => {
    it('应该返回完整的 Session 信息', async () => {
      const mockRemainingTime = 3600n;

      // Promise.all 会并行调用 isActive 和 getRemainingTime
      mockPublicClient.readContract
        .mockResolvedValueOnce(true) // isActive 调用
        .mockResolvedValueOnce(mockRemainingTime); // getRemainingTime 调用

      const info = await sessionModule.getInfo(MOCK_USER_ADDRESS);

      expect(info.isActive).toBe(true);
      expect(info.remainingTime).toBe(mockRemainingTime);
      // expiry 是计算出来的：now + remainingTime
      expect(typeof info.expiry).toBe('bigint');
      expect(info.expiry).toBeGreaterThan(0n);
    });

    it('Session 未激活时应该返回正确的状态', async () => {
      mockPublicClient.readContract
        .mockResolvedValueOnce(false) // isActive
        .mockResolvedValueOnce(0n) // expiry
        .mockResolvedValueOnce(0n); // remainingTime

      const info = await sessionModule.getInfo(MOCK_USER_ADDRESS);

      expect(info.isActive).toBe(false);
      expect(info.remainingTime).toBe(0n);
    });
  });

  describe('ensureActive', () => {
    it('Session 已激活时不应抛出错误', async () => {
      mockPublicClient.readContract.mockResolvedValue(true);

      await expect(sessionModule.ensureActive(MOCK_USER_ADDRESS)).resolves.not.toThrow();
    });

    it('Session 未激活时应该抛出错误', async () => {
      mockPublicClient.readContract.mockResolvedValue(false);

      await expect(sessionModule.ensureActive(MOCK_USER_ADDRESS)).rejects.toThrow('Session expired or inactive');
    });
  });
});
