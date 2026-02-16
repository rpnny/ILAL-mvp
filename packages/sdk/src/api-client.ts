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
}
