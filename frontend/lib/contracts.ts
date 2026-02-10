/**
 * ILAL 合约地址和 ABI 配置
 */

// ============ 合约地址 ============

// Base Mainnet (8453)
export const BASE_MAINNET_ADDRESSES = {
  registry: '0x0000000000000000000000000000000000000000', // TODO: 部署后更新
  sessionManager: '0x0000000000000000000000000000000000000000',
  verifier: '0x0000000000000000000000000000000000000000',
  complianceHook: '0x0000000000000000000000000000000000000000',
};

// Base Sepolia (84532)
export const BASE_SEPOLIA_ADDRESSES = {
  registry: '0x0000000000000000000000000000000000000000', // TODO: 部署后更新
  sessionManager: '0x0000000000000000000000000000000000000000',
  verifier: '0x0000000000000000000000000000000000000000',
  complianceHook: '0x0000000000000000000000000000000000000000',
};

// 根据链 ID 获取地址
export function getContractAddresses(chainId: number) {
  switch (chainId) {
    case 8453:
      return BASE_MAINNET_ADDRESSES;
    case 84532:
      return BASE_SEPOLIA_ADDRESSES;
    default:
      throw new Error(`Unsupported chain ID: ${chainId}`);
  }
}

// ============ ABI 导入 ============
// 注意：这些 ABI 应该在合约编译后从 forge 输出中复制

export { default as registryABI } from './abis/Registry.json';
export { default as sessionManagerABI } from './abis/SessionManager.json';
export { default as verifierABI } from './abis/Verifier.json';
export { default as complianceHookABI } from './abis/ComplianceHook.json';

// ============ Coinbase Verifications ============

export const COINBASE_ATTESTER_ADDRESS = '0x357458739F90461b99789350868CD7CF330Dd7EE';

// EAS Schema IDs
export const EAS_SCHEMA_IDS = {
  VERIFIED_ACCOUNT: '0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9',
  VERIFIED_COUNTRY: '0x1801901fabd0e6189356b4fb52bb0ab855276d84f7ec140839fbd1f6801ca065',
};
