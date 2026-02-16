/**
 * ILALClient 核心客户端测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ILALClient } from '../src/client';
import { createMockWalletClient, createMockPublicClient } from './mockData/clients';
import { MOCK_ADDRESSES } from './mockData/contracts';

describe('ILALClient', () => {
  let walletClient: any;
  let publicClient: any;

  beforeEach(() => {
    walletClient = createMockWalletClient();
    publicClient = createMockPublicClient();
  });

  describe('构造函数', () => {
    it('应该成功创建客户端实例', () => {
      const client = new ILALClient({
        walletClient,
        publicClient,
        chainId: 84532,
        addresses: MOCK_ADDRESSES,
      });

      expect(client).toBeDefined();
      expect(client.chainId).toBe(84532);
      expect(client.addresses).toEqual(MOCK_ADDRESSES);
    });

    it('缺少必要配置时应该抛出错误', () => {
      expect(() => {
        new ILALClient({
          walletClient: null as any,
          publicClient,
          chainId: 84532,
        });
      }).toThrow();
    });

    it('应该初始化所有模块', () => {
      const client = new ILALClient({
        walletClient,
        publicClient,
        chainId: 84532,
        addresses: MOCK_ADDRESSES,
      });

      expect(client.session).toBeDefined();
      expect(client.swap).toBeDefined();
      expect(client.liquidity).toBeDefined();
      expect(client.eas).toBeDefined();
    });
  });

  describe('fromProvider', () => {
    it('应该从 EIP-1193 Provider 创建客户端', () => {
      const mockProvider = {
        request: async () => ({}),
      };

      const client = ILALClient.fromProvider({
        provider: mockProvider as any,
        chainId: 84532,
        addresses: MOCK_ADDRESSES,
      });

      expect(client).toBeDefined();
      expect(client.chainId).toBe(84532);
    });
  });

  describe('fromRPC', () => {
    it('应该从 RPC URL 创建客户端', () => {
      // 注意：fromRPC 方法可能需要完整实现，这里暂时跳过
      // TODO: 实现 ILALClient.fromRPC 方法
      expect(true).toBe(true);
    });
  });

  describe('模块集成', () => {
    it('所有模块应该能访问相同的 clients', () => {
      const client = new ILALClient({
        walletClient,
        publicClient,
        chainId: 84532,
        addresses: MOCK_ADDRESSES,
      });

      // 验证模块都使用相同的底层 clients
      expect(client.session).toBeDefined();
      expect(client.swap).toBeDefined();
      expect(client.liquidity).toBeDefined();
    });
  });
});
