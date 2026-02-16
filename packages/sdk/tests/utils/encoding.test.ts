/**
 * 编码工具函数测试
 */

import { describe, it, expect } from 'vitest';
import { encodeWhitelistHookData, sortTokens } from '../../src/utils';
import { MOCK_USER_ADDRESS, MOCK_TOKEN_ADDRESSES } from '../mockData/contracts';

describe('编码工具函数', () => {
  describe('encodeWhitelistHookData', () => {
    it('应该正确编码用户地址', () => {
      const encoded = encodeWhitelistHookData(MOCK_USER_ADDRESS);

      expect(encoded).toBe(MOCK_USER_ADDRESS);
      expect(encoded.length).toBe(42); // '0x' + 40 chars
    });
  });

  describe('sortTokens', () => {
    it('应该按地址大小排序代币', () => {
      const [currency0, currency1, zeroForOne] = sortTokens(
        MOCK_TOKEN_ADDRESSES.WETH,
        MOCK_TOKEN_ADDRESSES.USDC
      );

      // USDC < WETH
      expect(currency0).toBe(MOCK_TOKEN_ADDRESSES.USDC);
      expect(currency1).toBe(MOCK_TOKEN_ADDRESSES.WETH);
      expect(zeroForOne).toBe(false); // 输入 WETH，但 WETH 是 currency1
    });

    it('输入代币是 currency0 时 zeroForOne 应该是 true', () => {
      const [currency0, currency1, zeroForOne] = sortTokens(
        MOCK_TOKEN_ADDRESSES.USDC,
        MOCK_TOKEN_ADDRESSES.WETH
      );

      expect(currency0).toBe(MOCK_TOKEN_ADDRESSES.USDC);
      expect(currency1).toBe(MOCK_TOKEN_ADDRESSES.WETH);
      expect(zeroForOne).toBe(true); // 输入 USDC，且 USDC 是 currency0
    });
  });
});
