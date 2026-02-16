/**
 * ILAL SDK 核心类型定义
 */

import type { Address, Hex, PublicClient, WalletClient } from 'viem';

// ============ SDK 配置 ============

export interface ILALConfig {
  walletClient: WalletClient;
  publicClient: PublicClient;
  chainId: number;
  addresses?: Partial<ContractAddresses>;
  zkConfig?: ZKProofConfig;
}

export interface ContractAddresses {
  registry: Address;
  sessionManager: Address;
  verifier: Address;
  complianceHook: Address;
  positionManager: Address;
  simpleSwapRouter: Address;
  plonkVerifier: Address;
  poolManager: Address;
}

export interface ZKProofConfig {
  wasmUrl: string | Buffer;
  zkeyUrl: string | Buffer;
  verificationKeyUrl?: string | Buffer;
}

// ============ Session 相关 ============

export interface SessionInfo {
  isActive: boolean;
  expiry: bigint;
  remainingTime: bigint;
}

export interface ActivateSessionParams {
  expiry?: number;  // 可选，默认 24 小时
  user?: Address;   // 可选，默认使用 walletClient 地址
}

// ============ Swap 相关 ============

export interface SwapParams {
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  slippageTolerance?: number;  // 百分比，如 0.5 表示 0.5%
  recipient?: Address;
  deadline?: bigint;
  sqrtPriceLimitX96?: bigint;
}

export interface SwapResult {
  hash: Hex;
  amount0: bigint;
  amount1: bigint;
  gasUsed?: bigint;
}

// ============ Liquidity 相关 ============

export interface PoolKey {
  currency0: Address;
  currency1: Address;
  fee: number;
  tickSpacing: number;
  hooks: Address;
}

export interface LiquidityParams {
  poolKey: PoolKey;
  tickLower: number;
  tickUpper: number;
  amount0Desired: bigint;
  amount1Desired: bigint;
  amount0Min?: bigint;
  amount1Min?: bigint;
  recipient?: Address;
  deadline?: bigint;
}

export interface RemoveLiquidityParams {
  tokenId: bigint;
  liquidity: bigint;
  amount0Min?: bigint;
  amount1Min?: bigint;
  deadline?: bigint;
}

export interface LiquidityResult {
  hash: Hex;
  tokenId?: bigint;
  liquidity: bigint;
  amount0: bigint;
  amount1: bigint;
}

export interface LiquidityPosition {
  tokenId: bigint;
  poolKey: PoolKey;
  tickLower: number;
  tickUpper: number;
  liquidity: bigint;
}

// ============ ZK Proof 相关 ============

export interface CircuitInput {
  userAddress: string;
  merkleRoot: string;
  issuerPubKeyHash: string;
  signature: string;
  kycStatus: string;
  countryCode: string;
  timestamp: string;
  merkleProof: string[];
  merkleIndex: string;
}

export interface ProofResult {
  proof: any;
  publicSignals: string[];
  elapsedTime?: number;
}

export type ProofProgressCallback = (progress: number, message: string) => void;

export interface ZKProofInput {
  userAddress: string;
  attestationData: AttestationData;
  onProgress?: ProofProgressCallback;
}

// ============ EAS 相关 ============

export interface AttestationData {
  uid: Hex;
  schema: Hex;
  attester: Address;
  recipient: Address;
  time: bigint;
  expirationTime: bigint;
  revocationTime: bigint;
  refUID: Hex;
  data: Hex;
}

export interface VerificationResult {
  isVerified: boolean;
  attestationId?: Hex;
  attestationData?: AttestationData;
  countryCode?: string;
}

// ============ EIP-712 相关 ============

export interface SwapPermit {
  user: Address;
  deadline: bigint;
  nonce: bigint;
}

export interface LiquidityPermit extends SwapPermit {
  isAdd: boolean;
}

export interface SignedPermit {
  user: Address;
  deadline: bigint;
  nonce: bigint;
  signature: Hex;
}

export interface EIP712Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: Address;
}

// ============ 错误类型 ============

export interface ILALErrorDetails {
  code: string;
  message: string;
  details?: any;
}

// ============ 事件类型 ============

export interface SessionStartedEvent {
  user: Address;
  expiry: bigint;
}

export interface SwapEvent {
  sender: Address;
  recipient: Address;
  amount0: bigint;
  amount1: bigint;
  sqrtPriceX96: bigint;
  liquidity: bigint;
  tick: number;
}
