/**
 * useSessionSDK - 使用 SDK 的 Session Hook
 * 
 * 从 880 行代码缩减到 60 行 🎉
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useILAL } from './useILAL';

export function useSessionSDK() {
  const { address } = useAccount();
  const { session, isReady } = useILAL();
  
  const [isActive, setIsActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loading, setLoading] = useState(false);

  // 查询 Session 状态
  const checkSession = useCallback(async () => {
    if (!session || !address || !isReady) {
      setIsActive(false);
      setTimeRemaining(0);
      return;
    }

    try {
      setLoading(true);
      
      // 🚀 一行代码查询 Session 状态！
      const active = await session.isActive(address);
      const remaining = await session.getRemainingTime(address);
      
      setIsActive(active);
      setTimeRemaining(Number(remaining));
    } catch (error) {
      console.error('Failed to check session:', error);
      setIsActive(false);
      setTimeRemaining(0);
    } finally {
      setLoading(false);
    }
  }, [session, address, isReady]);

  // 自动查询
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // 倒计时
  useEffect(() => {
    if (timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining]);

  // 格式化时间
  const formatTimeRemaining = (): string => {
    if (timeRemaining <= 0) return 'Expired';
    const hours = Math.floor(timeRemaining / 3600);
    const minutes = Math.floor((timeRemaining % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  return {
    isActive,
    timeRemaining,
    timeRemainingFormatted: formatTimeRemaining(),
    refresh: checkSession,
    loading,
  };
}
