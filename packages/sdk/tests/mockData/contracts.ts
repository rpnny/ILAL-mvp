/**
 * 测试用的模拟合约地址和数据
 */

import type { Address, Hex } from 'viem';
import type { ContractAddresses, PoolKey } from '../../src/types';

export const MOCK_ADDRESSES: ContractAddresses = {
  registry: '0x104DA869aDd4f1598127F03763a755e7dDE4f988',
  sessionManager: '0x4CB61d41E8D4ceCFb8C477ed069adFF309fB6d0e',
  verifier: '0x428aC1E38197bf37A42abEbA5f35B080438Ada22',
  complianceHook: '0xc2eD8e6F4C3a29275cC43e435795c5528BC9CF6A',
  positionManager: '0x2A1046A6d0EBdbfe4e45072CAf25833f4FAaEAB4',
  simpleSwapRouter: '0x5b460c8Bd32951183a721bdaa3043495D8861f31',
  plonkVerifier: '0x92eF7F6440466eb2138F7d179Cf2031902eF94be',
  poolManager: '0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408',
};

export const MOCK_USER_ADDRESS: Address = '0x1234567890123456789012345678901234567890';

export const MOCK_TOKEN_ADDRESSES = {
  USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address,
  WETH: '0x4200000000000000000000000000000000000006' as Address,
};

export const MOCK_POOL_KEY: PoolKey = {
  currency0: MOCK_TOKEN_ADDRESSES.USDC,
  currency1: MOCK_TOKEN_ADDRESSES.WETH,
  fee: 500,
  tickSpacing: 10,
  hooks: MOCK_ADDRESSES.complianceHook,
};

export const MOCK_TX_HASH: Hex = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
