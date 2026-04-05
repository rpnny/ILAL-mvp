/**
 * ILAL API Client - 通过 API 服务调用
 * 用于 API Key 认证模式
 */

import type { Address, Hex } from 'viem';

export interface ApiClientConfig {
  apiKey: string;
  baseUrl: string;
  chainId: number;
}

export interface VerifyResponse {
  success: boolean;
  txHash?: string;
  sessionExpiry?: string;
  gasUsed?: string;
  responseTime?: number;
  alreadyActive?: boolean;
  remainingSeconds?: number;
  error?: string;
  message?: string;
}

export interface SessionStatusResponse {
  address: Address;
  isActive: boolean;
  remainingSeconds: number;
  expiresAt: string | null;
}

export interface OnboardingRegisterResponse {
  success: boolean;
  institutionId?: string;
  status?: string;
  walletAddress?: string;
  merkleRoot?: string;
  leafIndex?: number;
  message?: string;
  error?: string;
}

export interface OnboardingStatusResponse {
  success: boolean;
  status: string;
  institutionId?: string;
  name?: string;
  walletAddress?: string;
  countryCode?: number;
  merkleIndex?: number;
  approvedAt?: string;
  createdAt?: string;
}

export interface IssuerAttestationData {
  sigR8x: string;
  sigR8y: string;
  sigS: string;
  issuerAx: string;
  issuerAy: string;
  kycStatus: string;
  countryCode: string;
  timestamp: string;
  merkleRoot: string;
  merkleProof: string[];
  merkleIndex: string;
}

export interface OnboardingAttestationResponse {
  success: boolean;
  attestation?: IssuerAttestationData;
  error?: string;
  message?: string;
}

export interface PreflightResponse {
  sessionActive: boolean;
  remainingSeconds: number;
  tokens: Record<string, { balance: string; decimals: number }>;
  allowances: Record<string, string>;
  issues: string[];
  poolHealth?: Record<string, unknown>;
}

export interface TransactionData {
  to: string;
  data: string;
  value: string;
  gas: string;
  chainId?: number;
}

export interface ApproveResponse {
  success: boolean;
  isApprovalNeeded: boolean;
  transaction?: TransactionData;
  allowance?: { current: string; requested: string; alreadySufficient: boolean };
}

export interface SwapResponse {
  success: boolean;
  transaction?: TransactionData;
  preflight?: Record<string, unknown>;
  error?: string;
}

export interface LiquidityResponse {
  success: boolean;
  transaction?: TransactionData;
  preflight?: Record<string, unknown>;
  liquidityWarning?: string;
  error?: string;
}

export interface QuoteResponse {
  success: boolean;
  estimatedOutput?: string;
  formattedOutput?: string;
  exchangeRate?: string;
  priceImpact?: string;
  suggestedMinAmountOut?: string;
  error?: string;
}

/**
 * API 客户端 - 与 ILAL API 服务通信
 */
export class ApiClient {
  private apiKey: string;
  private baseUrl: string;
  public readonly chainId: number;

  constructor(config: ApiClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // 移除尾部斜杠
    this.chainId = config.chainId;
  }

  /**
   * 发送 HTTP 请求到 API 服务
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
      ...(options.headers || {}),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: 'Unknown Error',
        message: response.statusText,
      })) as { error?: string; message?: string };

      throw new Error(
        `API request failed: ${errorData.error || 'Unknown error'} - ${errorData.message || response.statusText}`
      );
    }

    return await response.json() as T;
  }

  /**
   * 验证 ZK Proof 并激活 Session
   * 通过 API 服务调用，而不是直接上链
   */
  async verifyAndActivate(params: {
    userAddress: Address;
    proof: Hex;
    publicInputs: string[];
  }): Promise<VerifyResponse> {
    return await this.request<VerifyResponse>('/api/v1/verify', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * 查询 Session 状态
   */
  async getSessionStatus(userAddress: Address): Promise<SessionStatusResponse> {
    return await this.request<SessionStatusResponse>(
      `/api/v1/session/${userAddress}`,
      { method: 'GET' }
    );
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<any> {
    return await this.request('/api/v1/health', { method: 'GET' });
  }

  /**
   * 获取使用统计（需要 JWT token）
   */
  async getUsageStats(jwtToken: string): Promise<any> {
    return await this.request('/api/v1/usage/stats', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
      },
    });
  }

  // ============ Onboarding ============

  /**
   * Register a new institution (mock KYC auto-approve in POC)
   */
  async onboardingRegister(params: {
    name: string;
    walletAddress: string;
    countryCode?: number;
  }): Promise<OnboardingRegisterResponse> {
    return await this.request<OnboardingRegisterResponse>('/api/v1/onboarding/register', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Check onboarding status for a wallet address
   */
  async onboardingStatus(walletAddress: string): Promise<OnboardingStatusResponse> {
    return await this.request<OnboardingStatusResponse>(
      `/api/v1/onboarding/status/${walletAddress}`,
      { method: 'GET' },
    );
  }

  /**
   * Get a fresh IssuerAttestation for proof generation
   */
  async onboardingAttestation(walletAddress: string): Promise<OnboardingAttestationResponse> {
    return await this.request<OnboardingAttestationResponse>(
      `/api/v1/onboarding/attestation/${walletAddress}`,
      { method: 'GET' },
    );
  }

  // ============ DeFi ============

  /**
   * Preflight check — verify session, balances, allowances before trading
   */
  async preflight(userAddress: string): Promise<PreflightResponse> {
    return await this.request<PreflightResponse>(
      `/api/v1/defi/preflight/${userAddress}`,
      { method: 'GET' },
    );
  }

  /**
   * Build an ERC-20 approve transaction
   */
  async approve(params: {
    token: string;
    amount: string;
    userAddress: string;
    operation?: 'swap' | 'liquidity';
  }): Promise<ApproveResponse> {
    return await this.request<ApproveResponse>('/api/v1/defi/approve', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Build a swap transaction (unsigned — sign and broadcast yourself)
   */
  async swap(params: {
    tokenIn: string;
    tokenOut: string;
    amount: string;
    userAddress: string;
  }): Promise<SwapResponse> {
    return await this.request<SwapResponse>('/api/v1/defi/swap', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Build an add-liquidity transaction (unsigned)
   */
  async addLiquidity(params: {
    token0: string;
    token1: string;
    amount0: string;
    amount1: string;
    userAddress: string;
    tickLower?: number;
    tickUpper?: number;
  }): Promise<LiquidityResponse> {
    return await this.request<LiquidityResponse>('/api/v1/defi/liquidity', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Get a price quote for a swap (read-only, no gas needed)
   */
  async quote(params: {
    tokenIn: string;
    tokenOut: string;
    amount: string;
    userAddress?: string;
  }): Promise<QuoteResponse> {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return await this.request<QuoteResponse>(
      `/api/v1/defi/quote?${qs}`,
      { method: 'GET' },
    );
  }
}
