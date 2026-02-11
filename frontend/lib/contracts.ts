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

// Base Sepolia (84532) - 最后更新: 2026-02-11 (Swap修复)
export const BASE_SEPOLIA_ADDRESSES = {
  registry: '0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD',
  sessionManager: '0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2',
  verifier: '0x0cDcD82E5efba9De4aCc255402968397F323AFBB', // PlonkVerifierAdapter
  complianceHook: '0xDeDcFDF10b03AB45eEbefD2D91EDE66D9E5c8a80', // v2 Hook（完整 IHooks 接口 + v4 位掩码）
  positionManager: '0x5b460c8Bd32951183a721bdaa3043495D8861f31',
  simpleSwapRouter: '0x96ad5eAE7e5797e628F9d3FD21995dB19aE17d58', // v2 (修复Delta处理逻辑)
  plonkVerifier: '0x2645C48A7DB734C9179A195C51Ea5F022B86261f',
  poolManager: '0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408', // Uniswap v4 PoolManager
};

// 根据链 ID 获取地址
export function getContractAddresses(chainId: number) {
  switch (chainId) {
    case 84532:
      return BASE_SEPOLIA_ADDRESSES;
    case 8453:
      // 主网尚未部署，返回 null
      return null;
    default:
      return null;
  }
}

// ============ ABI 导入 ============
// 注意：这些 ABI 应该在合约编译后从 forge 输出中复制

export { default as registryABI } from './abis/Registry.json';
export { default as sessionManagerABI } from './abis/SessionManager.json';
export { default as verifierABI } from './abis/PlonkVerifierAdapter.json';
export { default as complianceHookABI } from './abis/ComplianceHook.json';
export { default as positionManagerABI } from './abis/VerifiedPoolsPositionManager.json';

// ============ Coinbase Verifications ============

export const COINBASE_ATTESTER_ADDRESS = '0x357458739F90461b99789350868CD7CF330Dd7EE';

// EAS Schema IDs
export const EAS_SCHEMA_IDS = {
  VERIFIED_ACCOUNT: '0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9',
  VERIFIED_COUNTRY: '0x1801901fabd0e6189356b4fb52bb0ab855276d84f7ec140839fbd1f6801ca065',
};
