/**
 * EAS (Ethereum Attestation Service) 工具函数
 * 简化版本 - 用于 Web Demo
 */

import { type Address } from 'viem';

export interface CoinbaseAttestation {
  uid: string;
  schema: string;
  attester: Address;
  recipient: Address;
  time: bigint;
  expirationTime: bigint;
  revocationTime: bigint;
  refUID: string;
  data: string;
  isMock: boolean;
}

export interface EASStatus {
  hasAttestation: boolean;
  attestation: CoinbaseAttestation | null;
  provider?: string;
}

/**
 * 创建 Mock Attestation（用于演示）
 */
export function createMockAttestation(
  recipient: Address,
  testMode: 'normal' | 'expired' | 'revoked' = 'normal'
): CoinbaseAttestation {
  const now = BigInt(Math.floor(Date.now() / 1000));
  const oneDay = BigInt(86400);

  let expirationTime = now + oneDay * 365n; // 默认 1 年有效期
  let revocationTime = 0n;

  if (testMode === 'expired') {
    expirationTime = now - oneDay; // 已过期
  } else if (testMode === 'revoked') {
    revocationTime = now - oneDay; // 已撤销
  }

  return {
    uid: '0x' + '1'.repeat(64),
    schema: '0x' + '2'.repeat(64),
    attester: '0x357458739F90461b99789350868CD7CF330Dd7EE' as Address, // Coinbase
    recipient,
    time: now - oneDay * 30n, // 30 天前创建
    expirationTime,
    revocationTime,
    refUID: '0x' + '0'.repeat(64),
    data: '0x',
    isMock: true,
  };
}

/**
 * 检查用户的 EAS Attestation
 */
export async function checkAllProviders(
  address: Address
): Promise<EASStatus> {
  // 在实际环境中，这里应该调用链上的 EAS 合约
  // 目前返回 Mock 数据用于演示

  const enableMock =
    process.env.NEXT_PUBLIC_ENABLE_MOCK === 'true' ||
    process.env.NEXT_PUBLIC_ENABLE_MOCK === '1';

  if (enableMock) {
    const testMode = (process.env.NEXT_PUBLIC_MOCK_TEST_MODE ||
      'normal') as 'normal' | 'expired' | 'revoked';

    return {
      hasAttestation: true,
      attestation: createMockAttestation(address, testMode),
      provider: 'Mock',
    };
  }

  // 生产模式：返回无认证
  // TODO: 实际应该查询链上的 EAS 合约
  return {
    hasAttestation: false,
    attestation: null,
  };
}

/**
 * 检查 Attestation 是否有效
 */
export function isAttestationValid(
  attestation: CoinbaseAttestation | null
): boolean {
  if (!attestation) return false;

  const now = BigInt(Math.floor(Date.now() / 1000));

  // 检查是否已撤销
  if (attestation.revocationTime > 0n) {
    return false;
  }

  // 检查是否过期
  if (attestation.expirationTime > 0n && attestation.expirationTime < now) {
    return false;
  }

  return true;
}
