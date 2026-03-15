/**
 * Session 管理模块
 * 提供 Session 查询和管理功能
 *
 * 重要：Session 激活需要 VERIFIER_ROLE 权限，普通用户钱包无法直接调用。
 * 正确的激活流程：
 *   1. 生成 ZK proof → client.zkproof.generate()
 *   2. 提交 proof 到 ILAL API → POST /api/v1/verify
 *   3. API 验证通过后自动调用 SessionManager.startSession()
 *
 * 使用 activateViaApi() 方法完成上述流程。
 */

import type { Address, Hex, PublicClient, WalletClient } from 'viem';
import type { SessionInfo, ActivateSessionParams } from '../types';
import { sessionManagerABI } from '../constants/abis';
import { SessionExpiredError, SessionNotFoundError } from '../utils/errors';
import { DEFAULT_SESSION_DURATION } from '../constants';

export interface ApiSessionConfig {
  apiBaseUrl: string;
  apiKey: string;
}

export class SessionModule {
  private apiConfig?: ApiSessionConfig;

  constructor(
    private walletClient: WalletClient,
    private publicClient: PublicClient,
    private sessionManagerAddress: Address
  ) {}

  /**
   * 设置 API 连接配置（用于 activateViaApi）
   */
  configureApi(config: ApiSessionConfig): void {
    this.apiConfig = config;
  }

  /**
   * 通过 ILAL API 激活 Session（推荐的机构接入方式）
   *
   * 流程：将 ZK proof 提交到 ILAL API，API 拥有 VERIFIER_ROLE，
   * 验证通过后自动调用 SessionManager.startSession()。
   *
   * @param proof - ZK proof hex
   * @param publicInputs - proof public inputs
   * @returns API 响应（包含 txHash、sessionExpiry 等）
   */
  async activateViaApi(params: {
    proof: Hex;
    publicInputs: string[];
    apiBaseUrl?: string;
    apiKey?: string;
  }): Promise<{ success: boolean; txHash?: string; sessionExpiry?: string }> {
    const baseUrl = params.apiBaseUrl || this.apiConfig?.apiBaseUrl;
    const apiKey = params.apiKey || this.apiConfig?.apiKey;

    if (!baseUrl || !apiKey) {
      throw new Error(
        'API config required. Call session.configureApi({ apiBaseUrl, apiKey }) first, ' +
        'or pass apiBaseUrl/apiKey in params.'
      );
    }

    const user = this.walletClient.account?.address;
    if (!user) {
      throw new Error('No user address available');
    }

    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/v1/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        userAddress: user,
        proof: params.proof,
        publicInputs: params.publicInputs,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText })) as any;
      throw new Error(`Session activation failed: ${err.error || err.message || res.statusText}`);
    }

    return res.json();
  }

  /**
   * 直接调用链上 SessionManager.startSession()
   *
   * ⚠️ 此方法需要调用方钱包拥有 VERIFIER_ROLE 权限。
   * 普通用户钱包无法使用此方法，请使用 activateViaApi() 代替。
   *
   * @param params - Session 参数
   * @returns 交易哈希
   */
  async activate(params?: ActivateSessionParams): Promise<Hex> {
    const user = params?.user || (this.walletClient.account?.address as Address);
    if (!user) {
      throw new Error('No user address available');
    }

    const duration = params?.expiry || DEFAULT_SESSION_DURATION;
    const expiry = BigInt(Math.floor(Date.now() / 1000) + duration);

    const hash = await this.walletClient.writeContract({
      address: this.sessionManagerAddress,
      abi: sessionManagerABI,
      functionName: 'startSession',
      args: [user, expiry],
      account: user,
      chain: undefined,
    } as any);

    await this.publicClient.waitForTransactionReceipt({ hash });

    return hash;
  }

  /**
   * 检查 Session 是否激活
   */
  async isActive(user?: Address): Promise<boolean> {
    const userAddress = user || (this.walletClient.account?.address as Address);
    if (!userAddress) {
      throw new Error('No user address available');
    }

    const isActive = await this.publicClient.readContract({
      address: this.sessionManagerAddress,
      abi: sessionManagerABI,
      functionName: 'isSessionActive',
      args: [userAddress],
    });

    return isActive as boolean;
  }

  /**
   * 获取 Session 剩余时间（秒）
   */
  async getRemainingTime(user?: Address): Promise<bigint> {
    const userAddress = user || (this.walletClient.account?.address as Address);
    if (!userAddress) {
      throw new Error('No user address available');
    }

    try {
      const remaining = await this.publicClient.readContract({
        address: this.sessionManagerAddress,
        abi: sessionManagerABI,
        functionName: 'getRemainingTime',
        args: [userAddress],
      });

      return remaining as bigint;
    } catch (error) {
      // 如果 Session 不存在，返回 0
      return 0n;
    }
  }

  /**
   * 获取 Session 过期时间戳
   */
  async getExpiry(user?: Address): Promise<bigint> {
    const userAddress = user || (this.walletClient.account?.address as Address);
    if (!userAddress) {
      throw new Error('No user address available');
    }

    try {
      const expiry = await this.publicClient.readContract({
        address: this.sessionManagerAddress,
        abi: sessionManagerABI,
        functionName: 'getSessionExpiry',
        args: [userAddress],
      });

      return expiry as bigint;
    } catch (error) {
      throw new SessionNotFoundError({ user: userAddress });
    }
  }

  /**
   * 获取完整的 Session 信息
   */
  async getInfo(user?: Address): Promise<SessionInfo> {
    const userAddress = user || (this.walletClient.account?.address as Address);
    if (!userAddress) {
      throw new Error('No user address available');
    }

    const [isActive, remainingTime] = await Promise.all([
      this.isActive(userAddress),
      this.getRemainingTime(userAddress),
    ]);

    const now = BigInt(Math.floor(Date.now() / 1000));
    const expiry = isActive ? now + remainingTime : 0n;

    return {
      isActive,
      expiry,
      remainingTime,
    };
  }

  /**
   * 确保 Session 处于激活状态，如果未激活则抛出错误
   */
  async ensureActive(user?: Address): Promise<void> {
    const isActive = await this.isActive(user);
    if (!isActive) {
      throw new SessionExpiredError({ user });
    }
  }

  /**
   * 激活 Session 并等待确认（如果尚未激活）
   *
   * ⚠️ 内部调用 activate()，需要 VERIFIER_ROLE。
   * 机构用户请使用 activateViaApi() 代替。
   */
  async activateIfNeeded(params?: ActivateSessionParams): Promise<{ activated: boolean; hash?: Hex }> {
    const user = params?.user || (this.walletClient.account?.address as Address);
    
    const isActive = await this.isActive(user);
    
    if (isActive) {
      return { activated: false };
    }

    const hash = await this.activate(params);
    return { activated: true, hash };
  }

  /**
   * 获取 Session 状态文本描述
   */
  async getStatusText(user?: Address): Promise<string> {
    const info = await this.getInfo(user);
    
    if (!info.isActive) {
      return 'Inactive';
    }

    const hours = Number(info.remainingTime) / 3600;
    
    if (hours < 1) {
      const minutes = Math.floor((Number(info.remainingTime) % 3600) / 60);
      return `Active (${minutes}m remaining)`;
    }
    
    return `Active (${Math.floor(hours)}h remaining)`;
  }
}
