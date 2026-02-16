/**
 * 测试用的模拟 viem clients
 */

import { createPublicClient, createWalletClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import type { PublicClient, WalletClient } from 'viem';

// 测试用私钥（请勿在生产环境使用）
const TEST_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

export function createMockWalletClient(): WalletClient {
  const account = privateKeyToAccount(TEST_PRIVATE_KEY);
  
  return createWalletClient({
    account,
    chain: baseSepolia,
    transport: http('https://base-sepolia-rpc.publicnode.com'),
  });
}

export function createMockPublicClient(): PublicClient {
  return createPublicClient({
    chain: baseSepolia,
    transport: http('https://base-sepolia-rpc.publicnode.com'),
  });
}
