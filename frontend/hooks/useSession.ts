'use client';

import { useAccount, useReadContract } from 'wagmi';
import { useEffect, useState } from 'react';
import { getContractAddresses, sessionManagerABI } from '@/lib/contracts';
import { DEMO_MODE, getDemoSessionStatus } from '@/lib/demo-mode';

/**
 * useSession Hook - 管理用户验证会话状态
 */
export function useSession() {
  const { address, chainId } = useAccount();
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [demoSession, setDemoSession] = useState<any>(null);

  const addresses = chainId ? getContractAddresses(chainId) : null;

  // 🎭 Demo 模式
  useEffect(() => {
    if (DEMO_MODE && address) {
      const session = getDemoSessionStatus();
      setDemoSession(session);
      if (session?.timeRemaining) {
        setTimeRemaining(session.timeRemaining);
      }
    }
  }, [address]);

  // 读取会话是否激活
  const { data: isActive, refetch: refetchActive } = useReadContract({
    address: addresses?.sessionManager as `0x${string}`,
    abi: sessionManagerABI,
    functionName: 'isSessionActive',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!addresses && !DEMO_MODE,
    },
  });

  // 读取会话过期时间
  const { data: expiry, refetch: refetchExpiry } = useReadContract({
    address: addresses?.sessionManager as `0x${string}`,
    abi: sessionManagerABI,
    functionName: 'sessionExpiry',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!addresses && !DEMO_MODE,
    },
  });

  // 读取剩余时间
  const { data: remaining, refetch: refetchRemaining } = useReadContract({
    address: addresses?.sessionManager as `0x${string}`,
    abi: sessionManagerABI,
    functionName: 'getRemainingTime',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!addresses && !DEMO_MODE,
    },
  });

  // 更新剩余时间（每秒）
  useEffect(() => {
    const time = DEMO_MODE ? demoSession?.timeRemaining : remaining;
    
    if (time) {
      setTimeRemaining(Number(time));

      const interval = setInterval(() => {
        setTimeRemaining((prev) => Math.max(0, prev - 1));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [remaining, demoSession, DEMO_MODE]);

  // 格式化剩余时间
  const formatTimeRemaining = (): string => {
    if (timeRemaining <= 0) return '已过期';

    const hours = Math.floor(timeRemaining / 3600);
    const minutes = Math.floor((timeRemaining % 3600) / 60);

    if (hours > 0) {
      return `${hours} 小时 ${minutes} 分钟`;
    }
    return `${minutes} 分钟`;
  };

  // 刷新所有状态
  const refresh = () => {
    if (DEMO_MODE) {
      const session = getDemoSessionStatus();
      setDemoSession(session);
    } else {
      refetchActive();
      refetchExpiry();
      refetchRemaining();
    }
  };

  // 返回值（Demo 模式优先）
  const finalIsActive = DEMO_MODE ? demoSession?.isActive : (isActive as boolean);
  const finalExpiry = DEMO_MODE ? demoSession?.expiry : (expiry ? Number(expiry) : 0);

  return {
    isActive: finalIsActive,
    expiry: finalExpiry,
    timeRemaining,
    timeRemainingFormatted: formatTimeRemaining(),
    refresh,
  };
}

/**
 * 示例使用:
 * 
 * ```tsx
 * function SessionStatus() {
 *   const { isActive, timeRemainingFormatted, refresh } = useSession();
 * 
 *   if (!isActive) {
 *     return <div>请先验证身份</div>;
 *   }
 * 
 *   return (
 *     <div>
 *       会话剩余时间: {timeRemainingFormatted}
 *       <button onClick={refresh}>刷新</button>
 *     </div>
 *   );
 * }
 * ```
 */
