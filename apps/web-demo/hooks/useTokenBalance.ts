'use client';

import { useState, useEffect } from 'react';
import { usePublicClient } from 'wagmi';
import { type Address, formatUnits } from 'viem';

/**
 * 自定义余额 Hook - 直接调用 RPC，绕过 wagmi 的 useBalance
 * 用于解决 useBalance 一直 Loading 的问题
 */
export function useTokenBalance(address: Address | undefined, tokenAddress?: Address) {
  const publicClient = usePublicClient();
  const [balance, setBalance] = useState<string>('Loading...');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address || !publicClient) {
      setBalance('--');
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const fetchBalance = async () => {
      try {
        console.log('[useTokenBalance] Fetching balance for', address, tokenAddress || 'ETH');
        
        if (!tokenAddress) {
          // ETH 余额
          const balance = await publicClient.getBalance({ address });
          if (isMounted) {
            const formatted = formatUnits(balance, 18);
            const rounded = parseFloat(formatted).toFixed(6);
            console.log('[useTokenBalance] ETH balance:', rounded);
            setBalance(rounded);
            setIsLoading(false);
          }
        } else {
          // ERC20 余额
          const ERC20_ABI = [
            {
              type: 'function',
              name: 'balanceOf',
              inputs: [{ name: 'account', type: 'address' }],
              outputs: [{ name: '', type: 'uint256' }],
              stateMutability: 'view',
            },
            {
              type: 'function',
              name: 'decimals',
              inputs: [],
              outputs: [{ name: '', type: 'uint8' }],
              stateMutability: 'view',
            },
          ] as const;

          const [balance, decimals] = await Promise.all([
            publicClient.readContract({
              address: tokenAddress,
              abi: ERC20_ABI,
              functionName: 'balanceOf',
              args: [address],
            }),
            publicClient.readContract({
              address: tokenAddress,
              abi: ERC20_ABI,
              functionName: 'decimals',
              args: [],
            }),
          ]);

          if (isMounted) {
            const formatted = formatUnits(balance, decimals);
            // USDC 也展示 6 位，避免小额 swap 后看起来“没变化”
            const rounded = parseFloat(formatted).toFixed(6);
            console.log('[useTokenBalance] Token balance:', rounded);
            setBalance(rounded);
            setIsLoading(false);
          }
        }
      } catch (err) {
        console.error('[useTokenBalance] Error:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch balance');
          setBalance('Error');
          setIsLoading(false);
        }
      }
    };

    // 立即获取一次
    fetchBalance();

    // 每 30 秒自动刷新
    const interval = setInterval(() => {
      fetchBalance();
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [address, tokenAddress, publicClient]);

  const refetch = async () => {
    if (!address || !publicClient) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      if (!tokenAddress) {
        const balance = await publicClient.getBalance({ address });
        const formatted = formatUnits(balance, 18);
        const rounded = parseFloat(formatted).toFixed(6);
        setBalance(rounded);
      } else {
        const ERC20_ABI = [
          {
            type: 'function',
            name: 'balanceOf',
            inputs: [{ name: 'account', type: 'address' }],
            outputs: [{ name: '', type: 'uint256' }],
            stateMutability: 'view',
          },
          {
            type: 'function',
            name: 'decimals',
            inputs: [],
            outputs: [{ name: '', type: 'uint8' }],
            stateMutability: 'view',
          },
        ] as const;

        const [balance, decimals] = await Promise.all([
          publicClient.readContract({
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [address],
          }),
          publicClient.readContract({
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: 'decimals',
            args: [],
          }),
        ]);

        const formatted = formatUnits(balance, decimals);
        const rounded = parseFloat(formatted).toFixed(6);
        setBalance(rounded);
      }
    } catch (err) {
      console.error('[useTokenBalance] Refetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch balance');
      setBalance('Error');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    balance,
    isLoading,
    error,
    refetch,
  };
}
