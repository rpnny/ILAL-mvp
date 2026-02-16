/**
 * Session 管理模块
 * 提供 Session 激活、查询和管理功能
 */

import type { Address, Hex, PublicClient, WalletClient } from 'viem';
import type { SessionInfo, ActivateSessionParams } from '../types';
import { sessionManagerABI } from '../constants/abis';
import { SessionExpiredError, SessionNotFoundError } from '../utils/errors';
import { DEFAULT_SESSION_DURATION } from '../constants';

export class SessionModule {
  constructor(
    private walletClient: WalletClient,
    private publicClient: PublicClient,
    private sessionManagerAddress: Address
  ) {}

  /**
   * 激活用户 Session
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

    // 等待交易确认
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
