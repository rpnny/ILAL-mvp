/**
 * ILAL API Mode Client
 * 使用 API Key 通过 ILAL API 服务调用
 * 适用于不直接连接区块链的场景
 */

import type { Address, Hex } from 'viem';
import { ApiClient, type ApiClientConfig, type VerifyResponse, type SessionStatusResponse } from './api-client';
import type { ZKProofConfig } from './types';
import { ZKProofModule } from './modules/zkproof';

export interface ILALApiClientConfig {
  apiKey: string;
  apiBaseUrl: string;
  chainId: number;
  zkConfig?: ZKProofConfig;
}

/**
 * ILAL API Mode Client
 * 通过 API 服务使用 ILAL，无需直接连接区块链
 * 
 * @example
 * ```typescript
 * import { ILALApiClient } from '@ilal/sdk';
 * 
 * const client = new ILALApiClient({
 *   apiKey: 'ilal_live_xxxxx',
 *   apiBaseUrl: 'https://api.ilal.xyz',
 *   chainId: 8453,
 * });
 * 
 * // 验证 ZK Proof 并激活 Session（通过 API）
 * const result = await client.verifyAndActivate({
 *   userAddress: '0x...',
 *   proof: '0x...',
 *   publicInputs: ['123', '456'],
 * });
 * 
 * // 查询 Session 状态
 * const status = await client.getSessionStatus('0x...');
 * ```
 */
export class ILALApiClient {
  private apiClient: ApiClient;
  public readonly chainId: number;
  public readonly zkproof?: ZKProofModule;

  constructor(config: ILALApiClientConfig) {
    this.apiClient = new ApiClient({
      apiKey: config.apiKey,
      baseUrl: config.apiBaseUrl,
      chainId: config.chainId,
    });

    this.chainId = config.chainId;

    // ZK Proof 模块（如果提供了配置）
    if (config.zkConfig) {
      this.zkproof = new ZKProofModule(config.zkConfig);
    }
  }

  /**
   * 验证 ZK Proof 并激活 Session
   * 通过 API 服务代理，无需直接上链
   * 
   * @param params - 验证参数
   * @returns 验证结果，包含交易哈希
   */
  async verifyAndActivate(params: {
    userAddress: Address;
    proof: Hex;
    publicInputs: string[];
  }): Promise<VerifyResponse> {
    return await this.apiClient.verifyAndActivate(params);
  }

  /**
   * 查询 Session 状态
   * 
   * @param userAddress - 用户地址
   * @returns Session 状态信息
   */
  async getSessionStatus(userAddress: Address): Promise<SessionStatusResponse> {
    return await this.apiClient.getSessionStatus(userAddress);
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<any> {
    return await this.apiClient.healthCheck();
  }

  /**
   * 获取使用统计（需要 JWT token）
   * 
   * @param jwtToken - JWT 访问 token
   * @returns 使用统计数据
   */
  async getUsageStats(jwtToken: string): Promise<any> {
    return await this.apiClient.getUsageStats(jwtToken);
  }

  /**
   * 生成 ZK Proof（如果配置了 zkproof 模块）
   */
  async generateProof(params: {
    userAddress: string;
    onProgress?: (progress: number, message: string) => void;
  }): Promise<{ proof: Hex; publicInputs: string[] }> {
    if (!this.zkproof) {
      throw new Error('ZK Proof module not configured. Provide zkConfig in constructor.');
    }

    const result = await this.zkproof.generate(params.userAddress, params.onProgress);
    return {
      proof: result.proof as Hex,
      publicInputs: result.publicSignals,
    };
  }

  /**
   * 完整流程：生成 ZK Proof 并通过 API 验证激活
   * 
   * @example
   * ```typescript
   * const result = await client.generateAndActivate({
   *   userAddress: '0x...',
   *   onProgress: (progress, msg) => console.log(progress, msg),
   * });
   * ```
   */
  async generateAndActivate(params: {
    userAddress: Address;
    onProgress?: (progress: number, message: string) => void;
  }): Promise<VerifyResponse> {
    // 1. 生成 ZK Proof
    const { proof, publicInputs } = await this.generateProof({
      userAddress: params.userAddress,
      onProgress: params.onProgress,
    });

    // 2. 通过 API 验证并激活
    return await this.verifyAndActivate({
      userAddress: params.userAddress,
      proof,
      publicInputs,
    });
  }

  /**
   * 获取链信息
   */
  getChainInfo(): { chainId: number; name: string } {
    return {
      chainId: this.chainId,
      name: this.chainId === 84532 ? 'Base Sepolia' : this.chainId === 8453 ? 'Base' : 'Unknown',
    };
  }
}
