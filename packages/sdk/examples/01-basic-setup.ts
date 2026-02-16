/**
 * Example 1: Basic Setup
 * 展示如何初始化 ILAL SDK 客户端
 */

import { ILALClient } from '@ilal/sdk';
import { createWalletClient, createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// 方法 1: 从 WalletClient 和 PublicClient 创建
const account = privateKeyToAccount('0x...' as `0x${string}`);

const walletClient = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http('https://base-sepolia-rpc.publicnode.com'),
});

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://base-sepolia-rpc.publicnode.com'),
});

const client = new ILALClient({
  walletClient,
  publicClient,
  chainId: 84532,
  zkConfig: {
    wasmUrl: '/circuits/compliance.wasm',
    zkeyUrl: '/circuits/compliance_final.zkey',
  },
});

// 方法 2: 从浏览器 Provider 创建（MetaMask）
const clientFromProvider = ILALClient.fromProvider({
  provider: window.ethereum,
  chainId: 84532,
});

// 方法 3: 从 RPC URL 创建
const clientFromRPC = ILALClient.fromRPC({
  rpcUrl: 'https://base-sepolia-rpc.publicnode.com',
  chainId: 84532,
  privateKey: '0x...' as `0x${string}`,
});

// 获取客户端信息
console.log('User address:', client.getUserAddress());
console.log('Chain:', client.getChainInfo());
console.log('Contracts:', client.addresses);

// 健康检查
const health = await client.healthCheck();
if (health.healthy) {
  console.log('✅ All contracts accessible');
} else {
  console.error('❌ Health check failed:', health.errors);
}
