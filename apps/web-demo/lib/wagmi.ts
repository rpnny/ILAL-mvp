import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base, baseSepolia } from 'wagmi/chains';
import { http } from 'wagmi';

// 临时解决方案：使用一个公共的测试Project ID或禁用WalletConnect
// 生产环境请在 https://cloud.walletconnect.com/ 获取你自己的Project ID
const FALLBACK_PROJECT_ID = 'demo-project-id-for-testing';

// 自定义 Base Sepolia 配置，使用最稳定的 RPC 节点
const baseSepoliaCustom = {
  ...baseSepolia,
  rpcUrls: {
    default: {
      http: [
        'https://sepolia.base.org', // Base 官方节点 - 最稳定
      ],
    },
    public: {
      http: [
        'https://sepolia.base.org',
      ],
    },
  },
};

export const config = getDefaultConfig({
  appName: 'ILAL',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || FALLBACK_PROJECT_ID,
  chains: [base, baseSepoliaCustom as any],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http('https://sepolia.base.org', {
      batch: false, // 禁用批处理
      retryCount: 2, // 减少重试次数，更快失败
      timeout: 10_000, // 10秒超时
    }),
  },
  ssr: true,
});
