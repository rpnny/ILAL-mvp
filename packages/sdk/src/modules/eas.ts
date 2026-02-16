/**
 * EAS (Ethereum Attestation Service) 验证模块
 * 支持多种合规凭证来源
 */

import type { Address, Hex, PublicClient } from 'viem';
import { parseAbiItem } from 'viem';
import type { VerificationResult, AttestationData } from '../types';
import { COINBASE_ATTESTER_ADDRESS, EAS_SCHEMA_IDS } from '../constants';
import { VerificationFailedError } from '../utils/errors';

// EAS 合约地址（Base 链上的预部署地址）
const EAS_CONTRACT = '0x4200000000000000000000000000000000000021' as const;

// ============ 类型定义 ============

export type IssuerType = 'coinbase-eas' | 'custom-kyc' | 'mock';

export interface KYCProviderConfig {
  name: string;
  attesterAddress: Address;
  schemaUID?: Hex;
  verify: (userAddress: Address, client: PublicClient) => Promise<AttestationData | null>;
}

export class EASModule {
  private registeredProviders: KYCProviderConfig[] = [];

  constructor(private publicClient: PublicClient) {}

  /**
   * 检查 Coinbase 验证状态
   */
  async checkCoinbaseVerification(userAddress: Address): Promise<VerificationResult> {
    try {
      // 查询 Attested 事件
      const attestedEventAbi = parseAbiItem(
        'event Attested(address indexed recipient, address indexed attester, bytes32 uid, bytes32 indexed schemaUID)'
      );

      const logs = await this.publicClient.getLogs({
        address: EAS_CONTRACT,
        event: attestedEventAbi,
        args: {
          recipient: userAddress,
          attester: COINBASE_ATTESTER_ADDRESS,
        },
        fromBlock: 0n,
        toBlock: 'latest',
      });

      if (logs.length === 0) {
        return {
          isVerified: false,
        };
      }

      // 获取最新的 attestation
      const latestLog = logs[logs.length - 1];
      const uid = latestLog.args.uid as Hex;

      // 获取完整 attestation 数据
      const getAttestationAbi = parseAbiItem(
        'function getAttestation(bytes32 uid) external view returns ((bytes32 uid, bytes32 schema, uint64 time, uint64 expirationTime, uint64 revocationTime, bytes32 refUID, address recipient, address attester, bool revocable, bytes data))'
      );

      const attestation = await this.publicClient.readContract({
        address: EAS_CONTRACT,
        abi: [getAttestationAbi],
        functionName: 'getAttestation',
        args: [uid],
      }) as any;

      // 验证 attestation 状态
      const now = BigInt(Math.floor(Date.now() / 1000));

      // 检查是否已撤销
      if (attestation.revocationTime > 0n) {
        return {
          isVerified: false,
          attestationId: uid,
        };
      }

      // 检查是否已过期
      if (attestation.expirationTime > 0n && attestation.expirationTime < now) {
        return {
          isVerified: false,
          attestationId: uid,
        };
      }

      // 检查 attester 是否为 Coinbase
      if (attestation.attester.toLowerCase() !== COINBASE_ATTESTER_ADDRESS.toLowerCase()) {
        return {
          isVerified: false,
          attestationId: uid,
        };
      }

      const attestationData: AttestationData = {
        uid,
        schema: attestation.schema,
        attester: attestation.attester,
        recipient: attestation.recipient,
        time: BigInt(attestation.time),
        expirationTime: BigInt(attestation.expirationTime),
        revocationTime: BigInt(attestation.revocationTime),
        refUID: attestation.refUID,
        data: attestation.data,
      };

      return {
        isVerified: true,
        attestationId: uid,
        attestationData,
      };
    } catch (error) {
      console.error('[EAS] Query failed:', error);
      return {
        isVerified: false,
      };
    }
  }

  /**
   * 注册自定义 KYC Provider
   */
  registerProvider(provider: KYCProviderConfig): void {
    this.registeredProviders.push(provider);
  }

  /**
   * 获取已注册的 Provider 列表
   */
  getRegisteredProviders(): readonly KYCProviderConfig[] {
    return this.registeredProviders;
  }

  /**
   * 查询所有 Provider（按优先级）
   */
  async checkAllProviders(userAddress: Address): Promise<VerificationResult> {
    // 1. 尝试 Coinbase EAS
    const coinbaseResult = await this.checkCoinbaseVerification(userAddress);
    if (coinbaseResult.isVerified) {
      return coinbaseResult;
    }

    // 2. 尝试自定义 Providers
    for (const provider of this.registeredProviders) {
      try {
        const attestation = await provider.verify(userAddress, this.publicClient);
        if (attestation) {
          return {
            isVerified: true,
            attestationId: attestation.uid,
            attestationData: attestation,
          };
        }
      } catch (error) {
        console.warn(`[KYC] Provider ${provider.name} failed:`, error);
      }
    }

    // 全部失败
    return {
      isVerified: false,
    };
  }

  /**
   * 获取用户的验证状态
   */
  async getVerification(userAddress: Address): Promise<VerificationResult> {
    return await this.checkAllProviders(userAddress);
  }

  /**
   * 确保用户已验证，否则抛出错误
   */
  async ensureVerified(userAddress: Address): Promise<void> {
    const result = await this.getVerification(userAddress);
    if (!result.isVerified) {
      throw new VerificationFailedError({ user: userAddress });
    }
  }

  /**
   * 创建模拟 attestation（仅限开发/测试）
   */
  createMockAttestation(
    userAddress: Address,
    testMode: 'normal' | 'expired' | 'revoked' = 'normal'
  ): AttestationData {
    console.warn('[EAS] ⚠️ Using MOCK attestation — NOT for production use');

    const now = BigInt(Math.floor(Date.now() / 1000));

    let expirationTime = 0n;
    let revocationTime = 0n;

    if (testMode === 'expired') {
      expirationTime = now - 86400n;
    } else if (testMode === 'revoked') {
      revocationTime = now - 3600n;
    }

    return {
      uid: '0x0000000000000000000000000000000000000000000000000000000000000000',
      schema: EAS_SCHEMA_IDS.VERIFIED_ACCOUNT as Hex,
      attester: COINBASE_ATTESTER_ADDRESS,
      recipient: userAddress,
      time: now - 86400n,
      expirationTime,
      revocationTime,
      refUID: '0x0000000000000000000000000000000000000000000000000000000000000000',
      data: '0x' as Hex,
    };
  }
}
