'use client';

import { useState } from 'react';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { generateComplianceProof } from '@/lib/zkProof';
import { getContractAddresses, sessionManagerABI } from '@/lib/contracts';
import { DEMO_MODE, mockGenerateProof, activateDemoSession } from '@/lib/demo-mode';

/**
 * useVerification Hook - 处理用户身份验证流程
 */
export function useVerification() {
  const { address, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const addresses = chainId ? getContractAddresses(chainId) : null;

  /**
   * 执行完整验证流程
   */
  const verify = async () => {
    if (!address) {
      setError('请先连接钱包');
      return;
    }

    setIsVerifying(true);
    setError(null);
    setProgress(0);

    try {
      // 🎭 Demo 模式：模拟完整流程
      if (DEMO_MODE) {
        console.log('🎭 Demo 模式：模拟验证流程');

        // 步骤 1: 检查 Coinbase 验证状态
        setProgress(10);
        await sleep(1000);
        console.log('✅ Coinbase 验证状态检查完成（模拟）');

        // 步骤 2: 生成 ZK Proof
        setProgress(30);
        console.log('生成零知识证明...（模拟）');
        await mockGenerateProof(address);
        
        setProgress(60);

        // 步骤 3: 提交链上验证
        setProgress(80);
        console.log('提交链上验证...（模拟）');
        await sleep(2000);

        // 成功
        setProgress(100);
        console.log('✅ 验证成功!（Demo 模式）');

        // 激活 Demo Session
        activateDemoSession();

        // 刷新页面以更新状态
        setTimeout(() => {
          window.location.reload();
        }, 1000);

        return true;
      }

      // 🔴 真实模式（需要合约）
      if (!walletClient || !publicClient || !addresses) {
        throw new Error('合约未部署。请启用 Demo 模式：NEXT_PUBLIC_ENABLE_MOCK=true');
      }

      // 步骤 1: 检查 Coinbase 验证状态 (10%)
      setProgress(10);
      console.log('检查 Coinbase 验证状态...');
      
      // TODO: 查询 EAS 获取 Coinbase attestation
      // const attestation = await fetchCoinbaseAttestation(address);
      
      // 步骤 2: 生成 ZK Proof (30%)
      setProgress(30);
      console.log('生成零知识证明...');

      // 模拟证明生成（实际应调用 Web Worker）
      const { proof, publicSignals } = await generateComplianceProof(
        address,
        // attestation
      );

      setProgress(60);

      // 步骤 3: 调用合约验证 (80%)
      console.log('提交链上验证...');

      const hash = await walletClient.writeContract({
        address: addresses.sessionManager as `0x${string}`,
        abi: sessionManagerABI,
        functionName: 'verifyAndStartSession',
        args: [proof, publicSignals],
      });

      // 等待交易确认
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === 'success') {
        setProgress(100);
        console.log('✅ 验证成功!');
        return true;
      } else {
        throw new Error('交易失败');
      }
    } catch (err) {
      console.error('验证失败:', err);
      setError(err instanceof Error ? err.message : '验证失败');
      return false;
    } finally {
      setIsVerifying(false);
    }
  };

  return {
    verify,
    isVerifying,
    progress,
    error,
  };
}

// 工具函数
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 示例使用:
 * 
 * ```tsx
 * function VerifyButton() {
 *   const { verify, isVerifying, progress, error } = useVerification();
 * 
 *   return (
 *     <div>
 *       <button onClick={verify} disabled={isVerifying}>
 *         {isVerifying ? `验证中... ${progress}%` : '验证身份'}
 *       </button>
 *       {error && <div className="error">{error}</div>}
 *     </div>
 *   );
 * }
 * ```
 */
