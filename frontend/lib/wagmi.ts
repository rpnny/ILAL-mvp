import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base, baseSepolia } from 'wagmi/chains';

// 临时解决方案：使用一个公共的测试Project ID或禁用WalletConnect
// 生产环境请在 https://cloud.walletconnect.com/ 获取你自己的Project ID
const FALLBACK_PROJECT_ID = 'demo-project-id-for-testing';

export const config = getDefaultConfig({
  appName: 'ILAL',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || FALLBACK_PROJECT_ID,
  chains: [base, baseSepolia],
  ssr: true,
});
