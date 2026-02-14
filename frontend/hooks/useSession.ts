'use client';

import { useAccount, useReadContract } from 'wagmi';
import { useEffect, useState, useCallback } from 'react';
import { getContractAddresses, sessionManagerABI } from '@/lib/contracts';
import { clearDemoSession, getLocalSessionStatus, DEMO_MODE } from '@/lib/demo-mode';

/**
 * useSession Hook - 管理用户验证会话状态
 *
 * 生产模式：只认链上 SessionManager（fail-closed）
 * Mock 模式：允许使用本地 Session（便于前端功能联调）
 */
export function useSession() {
  const { address, chainId } = useAccount();
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [localSessionActive, setLocalSessionActive] = useState(false);
  const [localRemaining, setLocalRemaining] = useState(0);

  const addresses = chainId ? getContractAddresses(chainId) : null;

  // 生产模式清理历史本地 Session；Mock 模式读取本地 Session
  useEffect(() => {
    if (DEMO_MODE) {
      const local = getLocalSessionStatus();
      setLocalSessionActive(local.isActive);
      setLocalRemaining(local.timeRemaining);
      return;
    }

    clearDemoSession();
    setLocalSessionActive(false);
    setLocalRemaining(0);
  }, [address]);

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

  // 生产模式只认链上；Mock 模式允许本地会话
  const isActive = DEMO_MODE
    ? (!!address && (!!onChainIsActive || localSessionActive))
    : (!!address && !!addresses && !!onChainIsActive);

  // 更新 timeRemaining
  useEffect(() => {
    let time = 0;

    if (!!address && !!onChainIsActive && onChainRemaining) {
      time = Number(onChainRemaining);
    } else if (DEMO_MODE && localSessionActive && localRemaining > 0) {
      time = localRemaining;
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
  }, [address, onChainIsActive, onChainRemaining, localSessionActive, localRemaining]);

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
    if (DEMO_MODE) {
      const local = getLocalSessionStatus();
      setLocalSessionActive(local.isActive);
      setLocalRemaining(local.timeRemaining);
    }
    if (addresses) {
      refetchActive();
      refetchRemaining();
    }
  }, [addresses, refetchActive, refetchRemaining]);

  // ============ 清除 Session ============

  const clearSession = useCallback(() => {
    clearDemoSession();
    setTimeRemaining(0);
  }, []);

  return {
    isActive,
    timeRemaining,
    timeRemainingFormatted: formatTimeRemaining(),
    refresh,
    clearSession,
  };
}
