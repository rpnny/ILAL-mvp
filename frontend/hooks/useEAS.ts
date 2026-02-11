'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { type Address } from 'viem';
import {
  checkAllProviders,
  createMockAttestation,
  type CoinbaseAttestation,
  type EASStatus,
} from '@/lib/eas';
import { DEMO_MODE } from '@/lib/demo-mode';

/**
 * useEAS - 查询用户的合规凭证状态（Multi-Issuer）
 *
 * 合规策略：
 * - 生产模式：fail-closed，凭证不可用时拒绝
 * - 演示模式（NEXT_PUBLIC_ENABLE_MOCK=true）：允许 mock 凭证
 */
export function useEAS() {
  const { address } = useAccount();

  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>(
    'idle'
  );
  const [attestation, setAttestation] = useState<CoinbaseAttestation | null>(
    null
  );
  const [hasAttestation, setHasAttestation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 查询 attestation（支持多 Issuer）
   */
  const checkAttestation = useCallback(async () => {
    if (!address) return;

    setStatus('loading');
    setError(null);

    try {
      const result: EASStatus = await checkAllProviders(
        address as Address
      );

      if (result.hasAttestation && result.attestation) {
        setAttestation(result.attestation);
        setHasAttestation(true);
        setStatus('done');
      } else if (DEMO_MODE) {
        // 仅在演示模式下允许 mock
        console.warn('[EAS] DEMO_MODE: using mock attestation');
        const mock = createMockAttestation(address);
        setAttestation(mock);
        setHasAttestation(true);
        setStatus('done');
      } else {
        // 生产模式：fail-closed
        setAttestation(null);
        setHasAttestation(false);
        setError(result.error || 'No valid compliance attestation found');
        setStatus('error');
      }
    } catch (err) {
      console.error('[EAS] 查询失败:', err);
      const errMsg = err instanceof Error ? err.message : 'Query failed';
      setError(errMsg);
      setStatus('error');

      if (DEMO_MODE && address) {
        // 演示模式容错
        const mock = createMockAttestation(address);
        setAttestation(mock);
        setHasAttestation(true);
      } else {
        // 生产模式：fail-closed
        setAttestation(null);
        setHasAttestation(false);
      }
    }
  }, [address]);

  // 地址变化时自动查询
  useEffect(() => {
    if (address) {
      checkAttestation();
    } else {
      setAttestation(null);
      setHasAttestation(false);
      setStatus('idle');
      setError(null);
    }
  }, [address, checkAttestation]);

  return {
    status,
    attestation,
    hasAttestation,
    isMock: attestation?.isMock ?? false,
    error,
    refresh: checkAttestation,
  };
}
