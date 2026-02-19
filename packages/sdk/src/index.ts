/**
 * ILAL SDK - Institutional Liquidity Access Layer
 * 
 * @packageDocumentation
 */

// ============ 核心客户端 ============
export { ILALClient } from './client';

// API Mode 客户端（使用 API Key）
export { ILALApiClient } from './api-mode-client';
export type { ILALApiClientConfig } from './api-mode-client';
export type { ApiClientConfig, VerifyResponse, SessionStatusResponse } from './api-client';

// ============ 模块 ============
export { SessionModule } from './modules/session';
export { SwapModule } from './modules/swap';
export { LiquidityModule } from './modules/liquidity';
export { ZKProofModule, poseidonHash } from './modules/zkproof';
export { EASModule } from './modules/eas';
export type { IssuerType, KYCProviderConfig } from './modules/eas';

// ============ 类型 ============
export type { ChainConfig } from './constants';

export type {
  // 配置
  ILALConfig,
  ContractAddresses,
  ZKProofConfig,
  
  // Session
  SessionInfo,
  ActivateSessionParams,
  
  // Swap
  SwapParams,
  SwapResult,
  
  // Liquidity
  PoolKey,
  LiquidityParams,
  RemoveLiquidityParams,
  LiquidityResult,
  LiquidityPosition,
  
  // ZK Proof
  CircuitInput,
  ProofResult,
  ProofProgressCallback,
  ZKProofInput,
  
  // EAS
  AttestationData,
  VerificationResult,
  
  // EIP-712
  SwapPermit,
  LiquidityPermit,
  SignedPermit,
  EIP712Domain,
} from './types';

// ============ 常量 ============
export {
  // 地址与链配置
  BASE_MAINNET_ADDRESSES,
  BASE_SEPOLIA_ADDRESSES,
  getContractAddresses,
  getChainConfig,
  CHAIN_RPC,
  isDeployed,
  COINBASE_ATTESTER_ADDRESS,
  EAS_SCHEMA_IDS,
  BASE_SEPOLIA_TOKENS,
  BASE_MAINNET_TOKENS,
  
  // ABI
  registryABI,
  sessionManagerABI,
  verifierABI,
  complianceHookABI,
  positionManagerABI,
  simpleSwapRouterABI,
  ERC20_ABI,
  
  // 常量
  DEFAULT_SLIPPAGE_TOLERANCE,
  DEFAULT_DEADLINE_MINUTES,
  DEFAULT_SESSION_DURATION,
  MIN_SQRT_PRICE,
  MAX_SQRT_PRICE,
  MIN_TICK,
  MAX_TICK,
  DEFAULT_GAS_LIMIT,
} from './constants';

// ============ 工具函数 ============
export {
  // EIP-712
  getDomain,
  SWAP_PERMIT_TYPES,
  LIQUIDITY_PERMIT_TYPES,
  signSwapPermit,
  signLiquidityPermit,
  encodeHookData,
  encodeWhitelistHookData,
  getDefaultDeadline,
  getNonce,
  createSignedSwapPermit,
  createSignedLiquidityPermit,
  safeSignSwapPermit,
  isDeadlineExpired,
  getRemainingTime,
  
  // 验证
  validateAddress,
  validateSwapParams,
  validateLiquidityParams,
  validatePoolKey,
  validateAndCalculateSlippage,
  normalizeAddress,
  
  // 编码
  getPoolId,
  encodePoolKey,
  decodePoolKey,
  encodeModifyLiquidityParams,
  encodeSwapParams,
  sortTokens,
  sqrtPriceX96ToPrice,
  priceToSqrtPriceX96,
  tickToSqrtPriceX96,
  sqrtPriceX96ToTick,
  getLiquidityForAmounts,
  
  // 错误处理
  ILALError,
  SessionExpiredError,
  SessionNotFoundError,
  InsufficientLiquidityError,
  SlippageExceededError,
  InvalidPoolError,
  UnauthorizedError,
  RouterNotApprovedError,
  VerificationFailedError,
  InvalidProofError,
  InvalidConfigError,
  ContractNotDeployedError,
  TransactionFailedError,
  GasEstimationError,
  parseContractError,
  
  // EIP-712 签名错误
  EIP712SigningError,
} from './utils';

// ============ 版本 ============
export const VERSION = '0.1.0';
