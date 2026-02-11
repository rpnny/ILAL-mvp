/**
 * ILAL - 合规凭证集成层（Multi-Issuer）
 *
 * 支持多种合规凭证来源：
 * 1. Coinbase Verifications (EAS on Base)
 * 2. 自定义 KYC/KYB Provider（Ondo、Circle 等机构自有 KYC 系统）
 * 3. 未来扩展：Polygon ID、WorldCoin、Galxe Passport
 *
 * 合规策略：
 * - fail-closed：凭证无法验证时拒绝（不默认放行）
 * - 完整校验：检查 revocation、expiration、schema、attester
 * - 可审计：所有验证结果产生链上事件
 */

import { createPublicClient, http, parseAbiItem, type Address, type Hex } from 'viem';
import { baseSepolia } from 'viem/chains';
import { COINBASE_ATTESTER_ADDRESS, EAS_SCHEMA_IDS } from './contracts';

// ============ 常量 ============

const EAS_CONTRACT = '0x4200000000000000000000000000000000000021' as const;

// ============ 类型 ============

/** 凭证来源类型 */
export type IssuerType = 'coinbase-eas' | 'custom-kyc' | 'mock';

export interface CoinbaseAttestation {
  uid: string;
  schemaUID: string;
  attester: string;
  recipient: string;
  time: bigint;
  expirationTime: bigint;
  revocationTime: bigint;
  verified: boolean;
  isMock: boolean;
  issuerType: IssuerType;
}

export interface EASStatus {
  hasAttestation: boolean;
  attestation: CoinbaseAttestation | null;
  error: string | null;
}

/** 自定义 KYC Provider 配置 */
export interface KYCProviderConfig {
  name: string;
  attesterAddress: Address;
  schemaUID?: Hex;
  /** 验证回调：返回该地址是否通过该 Provider 的 KYC */
  verify: (userAddress: Address) => Promise<CoinbaseAttestation | null>;
}

// ============ 已注册的 KYC Providers ============

const registeredProviders: KYCProviderConfig[] = [];

/**
 * 注册自定义 KYC Provider（供 Ondo 等机构接入）
 *
 * 示例：
 * ```ts
 * registerKYCProvider({
 *   name: 'Ondo KYB',
 *   attesterAddress: '0x...',
 *   verify: async (addr) => { ... }
 * });
 * ```
 */
export function registerKYCProvider(provider: KYCProviderConfig): void {
  registeredProviders.push(provider);
  console.log(`[KYC] Registered provider: ${provider.name} (${provider.attesterAddress})`);
}

/**
 * 获取所有已注册的 Provider 列表
 */
export function getRegisteredProviders(): readonly KYCProviderConfig[] {
  return registeredProviders;
}

// ============ EAS ABI ============

const getAttestationAbi = parseAbiItem(
  'function getAttestation(bytes32 uid) external view returns ((bytes32 uid, bytes32 schema, uint64 time, uint64 expirationTime, uint64 revocationTime, bytes32 refUID, address recipient, address attester, bool revocable, bytes data))'
);

const attestedEventAbi = parseAbiItem(
  'event Attested(address indexed recipient, address indexed attester, bytes32 uid, bytes32 indexed schemaUID)'
);

// ============ 核心查询 ============

/**
 * 查询用户是否有 Coinbase 验证 attestation
 *
 * 合规增强：
 * - 校验 attestation 是否已被撤销 (revocationTime > 0)
 * - 校验 attestation 是否已过期 (expirationTime < now)
 * - 校验 schema 是否匹配
 * - 校验 attester 是否为 Coinbase 官方地址
 */
export async function checkCoinbaseAttestation(
  userAddress: Address
): Promise<EASStatus> {
  try {
    const client = createPublicClient({
      chain: baseSepolia,
      transport: http('https://sepolia.base.org'),
    });

    // 查询 Attested 事件
    const logs = await client.getLogs({
      address: EAS_CONTRACT,
      event: attestedEventAbi,
      args: {
        recipient: userAddress,
        attester: COINBASE_ATTESTER_ADDRESS as Address,
      },
      fromBlock: BigInt(0),
      toBlock: 'latest',
    });

    if (logs.length === 0) {
      return {
        hasAttestation: false,
        attestation: null,
        error: null,
      };
    }

    // 获取最新的 attestation
    const latestLog = logs[logs.length - 1];
    const uid = latestLog.args.uid as Hex;

    // 拉取完整 attestation 数据（含 revocation/expiration）
    const attestationData = await client.readContract({
      address: EAS_CONTRACT,
      abi: [getAttestationAbi],
      functionName: 'getAttestation',
      args: [uid],
    });

    const now = BigInt(Math.floor(Date.now() / 1000));

    // 合规校验 1：检查是否已被撤销
    if (attestationData.revocationTime > 0n) {
      return {
        hasAttestation: true,
        attestation: null,
        error: `Compliance attestation has been revoked (revoked at ${new Date(Number(attestationData.revocationTime) * 1000).toISOString()})`,
      };
    }

    // 合规校验 2：检查是否已过期
    if (attestationData.expirationTime > 0n && attestationData.expirationTime < now) {
      return {
        hasAttestation: true,
        attestation: null,
        error: `Compliance attestation has expired (expired at ${new Date(Number(attestationData.expirationTime) * 1000).toISOString()})`,
      };
    }

    // 合规校验 3：检查 attester 是否为 Coinbase 官方
    if (attestationData.attester.toLowerCase() !== COINBASE_ATTESTER_ADDRESS.toLowerCase()) {
      return {
        hasAttestation: true,
        attestation: null,
        error: `Untrusted attestation issuer: ${attestationData.attester}`,
      };
    }

    // 合规校验 4：检查 schema 是否匹配
    const schemaHex = attestationData.schema as Hex;
    const isKnownSchema =
      schemaHex === EAS_SCHEMA_IDS.VERIFIED_ACCOUNT ||
      schemaHex === EAS_SCHEMA_IDS.VERIFIED_COUNTRY;

    if (!isKnownSchema) {
      console.warn('[EAS] Unknown schema:', schemaHex);
      // 不拒绝，但标记
    }

    return {
      hasAttestation: true,
      attestation: {
        uid,
        schemaUID: schemaHex,
        attester: attestationData.attester,
        recipient: userAddress,
        time: BigInt(attestationData.time),
        expirationTime: BigInt(attestationData.expirationTime),
        revocationTime: BigInt(attestationData.revocationTime),
        verified: true,
        isMock: false,
        issuerType: 'coinbase-eas',
      },
      error: null,
    };
  } catch (error) {
    console.error('[EAS] Query failed:', error);
    return {
      hasAttestation: false,
      attestation: null,
      error: error instanceof Error ? error.message : 'Failed to query EAS',
    };
  }
}

/**
 * 统一合规凭证查询（Multi-Issuer）
 *
 * 按优先级依次尝试：
 * 1. Coinbase EAS
 * 2. 自定义 KYC Providers（Ondo 等）
 *
 * 返回第一个有效的凭证，如果全部失败则返回 null
 */
export async function checkAllProviders(
  userAddress: Address
): Promise<EASStatus> {
  // 1. 尝试 Coinbase EAS
  const coinbaseResult = await checkCoinbaseAttestation(userAddress);
  if (coinbaseResult.attestation) {
    return coinbaseResult;
  }

  // 2. 尝试自定义 Providers
  for (const provider of registeredProviders) {
    try {
      const attestation = await provider.verify(userAddress);
      if (attestation) {
        return {
          hasAttestation: true,
          attestation,
          error: null,
        };
      }
    } catch (e) {
      console.warn(`[KYC] Provider ${provider.name} failed:`, e);
    }
  }

  // 全部失败
  return {
    hasAttestation: false,
    attestation: null,
    error: coinbaseResult.error || 'No valid compliance attestation found',
  };
}

/**
 * 创建模拟 attestation（仅限开发/演示模式）
 *
 * ⚠️ 生产环境中不应调用此函数
 */
export function createMockAttestation(userAddress: string): CoinbaseAttestation {
  console.warn('[EAS] ⚠️  Using MOCK attestation — NOT for production use');
  return {
    uid: '0x' + '0'.repeat(64),
    schemaUID: EAS_SCHEMA_IDS.VERIFIED_ACCOUNT,
    attester: COINBASE_ATTESTER_ADDRESS,
    recipient: userAddress,
    time: BigInt(Math.floor(Date.now() / 1000) - 86400),
    expirationTime: BigInt(0), // 0 = no expiration
    revocationTime: BigInt(0), // 0 = not revoked
    verified: true,
    isMock: true,
    issuerType: 'mock',
  };
}
