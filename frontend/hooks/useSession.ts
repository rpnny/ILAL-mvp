'use client';

import { useAccount, useReadContract } from 'wagmi';
import { useEffect, useState, useCallback } from 'react';
import { getContractAddresses, sessionManagerABI } from '@/lib/contracts';
import { getLocalSessionStatus, clearDemoSession } from '@/lib/demo-mode';

/**
 * useSession Hook - 管理用户验证会话状态
 *
 * 检查顺序：
 * 1. 链上 SessionManager.isSessionActive（如果在支持的网络上）
 * 2. 本地 localStorage Session（ZK 验证通过后存储）
 *
 * 任一返回 true 则认为 Session 有效
 */
export function useSession() {
  const { address, chainId } = useAccount();
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [localSession, setLocalSession] = useState<ReturnType<typeof getLocalSessionStatus> | null>(null);

  const addresses = chainId ? getContractAddresses(chainId) : null;

  // ============ 本地 Session（始终检查） ============

  const refreshLocal = useCallback(() => {
    if (typeof window === 'undefined') return;
    const session = getLocalSessionStatus();
    setLocalSession(session);
    if (session.isActive && session.timeRemaining > 0) {
      setTimeRemaining(session.timeRemaining);
    }
  }, []);

  // 初始加载 + address 变化时刷新
  useEffect(() => {
    refreshLocal();
  }, [address, refreshLocal]);

  // ============ 链上 Session ============

  const { data: onChainIsActive, refetch: refetchActive } = useReadContract({
    address: addresses?.sessionManager as `0x${string}`,
    abi: sessionManagerABI,
    functionName: 'isSessionActive',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!addresses,
    },
  });

  const { data: onChainRemaining, refetch: refetchRemaining } = useReadContract({
    address: addresses?.sessionManager as `0x${string}`,
    abi: sessionManagerABI,
    functionName: 'getRemainingTime',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!addresses,
    },
  });

  // ============ 合并判断 ============

  // 链上 active 或本地 active 都算有效
  const isActive = !!(onChainIsActive) || !!(localSession?.isActive);

  // 更新 timeRemaining
  useEffect(() => {
    let time = 0;

    if (onChainIsActive && onChainRemaining) {
      time = Number(onChainRemaining);
    } else if (localSession?.isActive && localSession.timeRemaining > 0) {
      time = localSession.timeRemaining;
    }

    if (time > 0) {
      setTimeRemaining(time);

      const interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [onChainIsActive, onChainRemaining, localSession]);

  // ============ 格式化 ============

  const formatTimeRemaining = (): string => {
    if (timeRemaining <= 0) return 'Expired';

    const hours = Math.floor(timeRemaining / 3600);
    const minutes = Math.floor((timeRemaining % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // ============ 刷新 ============

  const refresh = useCallback(() => {
    refreshLocal();
    if (addresses) {
      refetchActive();
      refetchRemaining();
    }
  }, [refreshLocal, addresses, refetchActive, refetchRemaining]);

  // ============ 清除 Session ============

  const clearSession = useCallback(() => {
    clearDemoSession();
    refreshLocal();
  }, [refreshLocal]);

  return {
    isActive,
    timeRemaining,
    timeRemainingFormatted: formatTimeRemaining(),
    refresh,
    clearSession,
  };
}
