'use client';

import { useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { generateComplianceProof, formatProofForContract, type ProofProgressCallback } from '@/lib/zkProof';
import { getContractAddresses, verifierABI } from '@/lib/contracts';
import { checkAllProviders, createMockAttestation, type CoinbaseAttestation } from '@/lib/eas';
import { activateDemoSession, DEMO_MODE } from '@/lib/demo-mode';
import type { Address, Hash } from 'viem';

// Verifier Relay 后端地址
const RELAY_URL = process.env.NEXT_PUBLIC_RELAY_URL || 'http://localhost:3001';

/**
 * useVerification Hook — 生产级合规验证流程
 *
 * 流程：
 * 1. 查询合规凭证（EAS / 自定义 KYC Provider，fail-closed）
 * 2. 在 Web Worker 中生成 PLONK ZK Proof
 * 3. 调用链上 PlonkVerifierAdapter.verifyComplianceProof（只读校验）
 * 4. 将 Proof 提交给 Verifier Relay 后端
 *    → Relay 用 VERIFIER_ROLE 私钥调用 SessionManager.startSession
 *    → 产生链上 SessionStarted 事件（可审计、可索引）
 *
 * 合规要求：
 * - fail-closed：凭证不可用时拒绝
 * - 链上可审计：Session 激活产生 SessionStarted 事件
 * - 多 Issuer：Coinbase EAS + 自定义 Provider
 * - 用户无需 VERIFIER_ROLE：由 Relay 后端代理完成链上操作
 */
export function useVerification() {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();

  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<string>('');
  const [txHash, setTxHash] = useState<Hash | null>(null);
  const [gasUsed, setGasUsed] = useState<bigint | null>(null);

  const addresses = chainId ? getContractAddresses(chainId) : null;

  const verify = async () => {
    if (!address) {
      setError('Please connect your wallet first');
      return false;
    }

    if (!publicClient) {
      setError('Wallet client not ready');
      return false;
    }

    // Check network
    if (!addresses) {
      setError(
        chainId
          ? `Current network (Chain ID: ${chainId}) is not supported. Please switch to Base Sepolia (Chain ID: 84532).`
          : 'Unable to detect network. Please ensure your wallet is connected to Base Sepolia.'
      );
      return false;
    }

    setIsVerifying(true);
    setIsSuccess(false);
    setError(null);
    setProgress(0);
    setStage('');
    setTxHash(null);
    setGasUsed(null);

    try {
      // ================================================================
      // Step 1: Query compliance credentials (Multi-Issuer, fail-closed)
      // ================================================================
      setProgress(3);
      setStage('Querying compliance credentials...');
      console.log('[Verify] Step 1: Checking attestation for', address);

      let attestation: CoinbaseAttestation | null = null;

      try {
        const result = await checkAllProviders(address as Address);
        attestation = result.attestation;
        if (!attestation && result.error) {
          console.warn('[Verify] All providers failed:', result.error);
        }
      } catch (e) {
        console.warn('[Verify] Provider query failed:', e);
      }

      // fail-closed: no credentials → reject (only DEMO_MODE allows mock)
      if (!attestation) {
        if (DEMO_MODE) {
          console.warn('[Verify] DEMO_MODE: using mock attestation');
          attestation = createMockAttestation(address);
        } else {
          throw new Error(
            'Unable to obtain compliance credentials. Please ensure you have completed Coinbase identity verification, ' +
            'or contact your KYC service provider.'
          );
        }
      }

      setProgress(5);
      console.log('[Verify] Attestation:', attestation.isMock ? 'mock (DEMO)' : 'REAL');

      // ================================================================
      // Step 2: Generate ZK Proof (Web Worker)
      // ================================================================
      setStage('Generating zero-knowledge proof...');
      console.log('[Verify] Step 2: Generating ZK proof...');

      const onProofProgress: ProofProgressCallback = (pct, msg) => {
        setProgress(pct);
        setStage(msg);
      };

      const proofResult = await generateComplianceProof(
        address,
        attestation,
        onProofProgress
      );

      console.log('[Verify] Proof generated in', proofResult.elapsedTime, 'ms');

      // ================================================================
      // Step 3: On-chain Proof verification (read-only, no gas)
      // ================================================================
      setProgress(85);
      setStage('Verifying proof on-chain...');
      console.log('[Verify] Step 3: On-chain verification...');

      const { proofBytes, publicInputs } = formatProofForContract(
        proofResult.proof,
        proofResult.publicSignals
      );

      const isValid = await publicClient.readContract({
        address: addresses.verifier as Address,
        abi: verifierABI,
        functionName: 'verifyComplianceProof',
        args: [proofBytes, publicInputs],
      });

      if (!isValid) {
        throw new Error('On-chain verification failed: PlonkVerifier rejected this proof');
      }

      console.log('[Verify] On-chain verification: PASSED');

      // ================================================================
      // Step 4: Submit to Verifier Relay → Activate Session on-chain
      // ================================================================
      setProgress(90);
      setStage('Activating Session on-chain...');
      console.log('[Verify] Step 4: Submitting to Verifier Relay...');

      let sessionActivatedOnChain = false;

      try {
        const relayResponse = await fetch(`${RELAY_URL}/api/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userAddress: address,
            proof: proofBytes,
            publicInputs: publicInputs.map(n => n.toString()),
          }),
        });

        const relayResult = await relayResponse.json();

        if (relayResult.success) {
          sessionActivatedOnChain = true;

          if (relayResult.txHash) {
            setTxHash(relayResult.txHash as Hash);
            console.log('[Verify] Session TX:', relayResult.txHash);
          }

          if (relayResult.gasUsed) {
            setGasUsed(BigInt(relayResult.gasUsed));
          }

          if (relayResult.alreadyActive) {
            console.log('[Verify] Session already active on-chain');
          } else {
            console.log('[Verify] Session activated on-chain via Relay!');
          }
        } else {
          console.warn('[Verify] Relay returned error:', relayResult.error);
        }
      } catch (relayErr) {
        console.warn('[Verify] Relay unavailable, falling back to local session:', relayErr);
      }

      // Relay 不可用时 fallback 到本地 Session（向后兼容）
      if (!sessionActivatedOnChain) {
        console.log('[Verify] Falling back to local session');
        activateDemoSession();
      }

      // ================================================================
      // Complete
      // ================================================================
      setProgress(100);
      setStage(sessionActivatedOnChain
        ? 'Verification successful! Session activated on-chain'
        : 'Verification successful! Local Session activated'
      );
      setIsSuccess(true);
      console.log('[Verify] Complete!', {
        onChain: sessionActivatedOnChain,
        proofTime: proofResult.elapsedTime,
        attestationReal: !attestation.isMock,
      });

      // 2 秒后刷新页面
      setTimeout(() => {
        window.location.reload();
      }, 2000);

      return true;
    } catch (err) {
      console.error('[Verify] Error:', err);
      const msg = err instanceof Error ? err.message : 'Verification failed';

      if (msg.includes('User rejected') || msg.includes('denied')) {
        setError('User canceled the operation');
      } else if (msg.includes('timeout')) {
        setError('Operation timed out, please retry');
      } else if (msg.includes('Unsupported')) {
        setError('Please switch to Base Sepolia network');
      } else if (msg.includes('Assert Failed')) {
        setError('ZK circuit assertion failed, please refresh and retry');
      } else if (msg.includes('returned no data')) {
        setError('On-chain contract call failed, please ensure you are connected to Base Sepolia');
      } else if (msg.includes('compliance credentials')) {
        setError(msg);
      } else {
        setError(msg);
      }
      setStage('Verification failed');
      setIsVerifying(false);
      return false;
    }
  };

  return {
    verify,
    isVerifying,
    isSuccess,
    progress,
    stage,
    error,
    txHash,
    gasUsed,
  };
}
