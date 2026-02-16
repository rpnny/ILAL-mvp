/**
 * useSwapSDK - 使用 SDK 的 Swap Hook
 * 
 * 从 880 行代码缩减到 150 行 🎉
 * 所有复杂的合约调用、EIP-712 签名、代币授权全部由 SDK 处理！
 */

'use client';

import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { parseUnits, formatUnits, type Address } from 'viem';
import { useILAL } from './useILAL';
import { useSessionSDK } from './useSessionSDK';
import { BASE_SEPOLIA_TOKENS } from '@ilal/sdk';

export type SwapStatus = 'idle' | 'approving' | 'signing' | 'swapping' | 'confirming' | 'success' | 'error';

export interface SwapParams {
  fromToken: string;
  toToken: string;
  amount: string;
  slippage?: number;
}

export function useSwapSDK() {
  const { address } = useAccount();
  const { swap, isReady } = useILAL();
  const { isActive } = useSessionSDK();
  
  const [status, setStatus] = useState<SwapStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  /**
   * 执行交易 - 一行 SDK 调用替代 400+ 行代码！
   */
  const executeSwap = useCallback(
    async (params: SwapParams): Promise<boolean> => {
      if (!swap || !isReady) {
        setError('SDK not ready');
        return false;
      }

      if (!address) {
        setError('Please connect wallet');
        return false;
      }

      if (!isActive) {
        setError('Please complete identity verification first');
        return false;
      }

      setStatus('swapping');
      setError(null);
      setTxHash(null);

      try {
        // 获取代币信息
        const { USDC, WETH } = BASE_SEPOLIA_TOKENS;
        const fromToken = params.fromToken === 'USDC' ? USDC : WETH;
        const toToken = params.toToken === 'USDC' ? USDC : WETH;
        
        // 获取代币信息（decimal）
        const fromTokenInfo = await swap.getTokenInfo(fromToken);
        const amountIn = parseUnits(params.amount, fromTokenInfo.decimals);

        // 🎉 一行代码执行交换！SDK 自动处理：
        // - EIP-712 签名
        // - 代币授权 (approve)
        // - Pool 价格查询
        // - 滑点计算
        // - 交易执行
        const result = await swap.execute({
          tokenIn: fromToken as Address,
          tokenOut: toToken as Address,
          amountIn,
          slippageTolerance: params.slippage || 0.5,
        });

        setTxHash(result.hash);
        setStatus('success');
        
        console.log('✅ Swap success:', {
          hash: result.hash,
          amountIn: result.amountIn.toString(),
          amountOut: result.amountOut.toString(),
        });

        return true;
      } catch (err: any) {
        console.error('❌ Swap failed:', err);
        
        const msg = err.message || 'Transaction failed';
        
        if (msg.includes('User rejected') || msg.includes('denied')) {
          setError('User cancelled the operation');
        } else if (msg.includes('Session') || msg.includes('not active')) {
          setError('Session not active');
        } else if (msg.includes('insufficient')) {
          setError('Insufficient balance');
        } else {
          setError(msg);
        }

        setStatus('error');
        return false;
      }
    },
    [swap, isReady, address, isActive]
  );

  /**
   * 获取代币余额
   */
  const getBalance = useCallback(
    async (token: string): Promise<string> => {
      if (!swap || !address) return '0';

      try {
        const { USDC, WETH } = BASE_SEPOLIA_TOKENS;
        const tokenAddress = token === 'USDC' ? USDC : WETH;
        
        // 🚀 一行代码查询余额！
        const balance = await swap.getBalance(tokenAddress as Address, address);
        const tokenInfo = await swap.getTokenInfo(tokenAddress as Address);
        
        return formatUnits(balance, tokenInfo.decimals);
      } catch (error) {
        console.error('Failed to get balance:', error);
        return '0';
      }
    },
    [swap, address]
  );

  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setTxHash(null);
  }, []);

  return {
    status,
    error,
    txHash,
    executeSwap,
    getBalance,
    reset,
    isReady,
  };
}

/**
 * 🎉 使用对比：
 * 
 * 之前（880 行代码）：
 * - 手动构造 EIP-712 签名
 * - 手动 approve 代币
 * - 手动查询 Pool 价格
 * - 手动计算滑点
 * - 手动构造 PoolKey 和 SwapParams
 * - 手动调用 SimpleSwapRouter.swap()
 * - 手动处理 ETH/WETH 转换
 * - 手动解析交易结果
 * 
 * 现在（1 行代码）：
 * await swap.execute({ tokenIn, tokenOut, amountIn, slippageTolerance });
 * 
 * SDK 自动处理所有复杂逻辑！🚀
 */
