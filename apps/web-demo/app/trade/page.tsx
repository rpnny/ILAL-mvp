'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { type Address } from 'viem';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useSession } from '@/hooks/useSession';
import { useSwap, TOKENS } from '@/hooks/useSwap';
import { useTokenBalance } from '@/hooks/useTokenBalance';
import Link from 'next/link';

const TOKEN_LIST = Object.keys(TOKENS);

export default function TradePage() {
  const { address, isConnected } = useAccount();
  const { isActive, timeRemainingFormatted } = useSession();
  const { status, error, txHash, quote, getQuote, executeSwap, reset, getPrice, lastSwapDelta } = useSwap();

  // Token balances - 使用自定义 hook 绕过 wagmi 的问题
  const { 
    balance: ethBalanceStr, 
    isLoading: ethBalanceLoading, 
    error: ethBalanceErrorMsg,
    refetch: refetchEthBalance 
  } = useTokenBalance(address);
  
  const { 
    balance: usdcBalanceStr, 
    isLoading: usdcBalanceLoading, 
    error: usdcBalanceErrorMsg,
    refetch: refetchUsdcBalance 
  } = useTokenBalance(address, '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address);

  const {
    balance: wethBalanceStr,
    isLoading: wethBalanceLoading,
    error: wethBalanceErrorMsg,
    refetch: refetchWethBalance,
  } = useTokenBalance(address, '0x4200000000000000000000000000000000000006' as Address);
  
  const ethBalanceError = !!ethBalanceErrorMsg;
  const usdcBalanceError = !!usdcBalanceErrorMsg;
  const wethBalanceError = !!wethBalanceErrorMsg;

  // 调试日志
  useEffect(() => {
    if (address) {
      console.log('[Trade] Balance status:', {
        address,
        ethBalance: ethBalanceStr,
        ethBalanceError,
        ethBalanceLoading,
        usdcBalance: usdcBalanceStr,
        usdcBalanceError,
        usdcBalanceLoading,
        wethBalance: wethBalanceStr,
        wethBalanceError,
        wethBalanceLoading,
      });
    }
  }, [address, ethBalanceStr, usdcBalanceStr, wethBalanceStr, ethBalanceError, usdcBalanceError, wethBalanceError, ethBalanceLoading, usdcBalanceLoading, wethBalanceLoading]);

  const [fromToken, setFromToken] = useState('ETH');
  const [toToken, setToToken] = useState('USDC');
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState(50); // 0.5%

  const fromBalance = useMemo(() => {
    if (fromToken === 'ETH') {
      if (ethBalanceLoading) return 'Loading...';
      if (ethBalanceError) return 'Error';
      return ethBalanceStr;
    }
    if (fromToken === 'WETH') {
      if (wethBalanceLoading) return 'Loading...';
      if (wethBalanceError) return 'Error';
      return wethBalanceStr;
    }
    if (fromToken === 'USDC') {
      if (usdcBalanceLoading) return 'Loading...';
      if (usdcBalanceError) return 'Error';
      return usdcBalanceStr;
    }
    return '--';
  }, [fromToken, ethBalanceStr, usdcBalanceStr, wethBalanceStr, ethBalanceError, usdcBalanceError, wethBalanceError, ethBalanceLoading, usdcBalanceLoading, wethBalanceLoading]);

  // 获取报价
  useEffect(() => {
    const timer = setTimeout(() => {
      if (amount && parseFloat(amount) > 0) {
        getQuote({ fromToken, toToken, amount, slippage });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [amount, fromToken, toToken, slippage, getQuote]);

  // 交换代币方向
  const flipTokens = useCallback(() => {
    const prevFrom = fromToken;
    setFromToken(toToken);
    setToToken(prevFrom);
    setAmount('');
    reset();
  }, [fromToken, toToken, reset]);

  // 执行交易
  const handleSwap = async () => {
    console.log('[Trade] handleSwap called:', { fromToken, toToken, amount, slippage });
    
    // 开始新交易前，先清除旧的错误和状态
    reset();
    
    try {
      const success = await executeSwap({ fromToken, toToken, amount, slippage });
      console.log('[Trade] executeSwap result:', success);
      if (success) {
        // 交易成功后立即刷新余额，避免“金额看起来没变化”
        await Promise.all([
          refetchEthBalance(),
          refetchUsdcBalance(),
          refetchWethBalance(),
        ]);
        setAmount('');
      }
    } catch (err) {
      console.error('[Trade] handleSwap error:', err);
    }
  };

  // 未连接
  if (!isConnected) {
    return (
      <div className="max-w-md mx-auto p-6 mt-12">
        <div className="card p-8 text-center space-y-4">
          <h1 className="text-2xl font-bold text-slate-900">Trade</h1>
          <p className="text-slate-500 text-sm">Please connect your wallet first</p>
          <div className="flex justify-center">
            <ConnectButton />
          </div>
        </div>
      </div>
    );
  }

  // 未验证
  if (!isActive) {
    return (
      <div className="max-w-md mx-auto p-6 mt-12">
        <div className="card p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Verification Required</h2>
          <p className="text-sm text-slate-500">
            You need to complete ZK verification to use the compliant trading pool
          </p>
          <Link
            href="/"
            className="inline-block w-full py-3 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 transition text-center"
          >
            Go to Verification
          </Link>
        </div>
      </div>
    );
  }

  const price = typeof getPrice === 'function' ? getPrice(fromToken, toToken) : null;

  return (
    <div className="max-w-md mx-auto p-6 mt-8 space-y-4">
      {/* Session 提示 */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-1.5 text-emerald-600">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Verified &middot; {timeRemainingFormatted}</span>
        </div>
        <span className="text-slate-400">Base Sepolia</span>
      </div>

      {/* 交易卡片 */}
      <div className="card p-6 space-y-4">
        <h1 className="text-lg font-bold text-slate-900">Trade</h1>

        {/* From */}
        <div className="bg-slate-50 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Pay</span>
            <div className="flex items-center space-x-2">
              <span className={ethBalanceError || usdcBalanceError || wethBalanceError ? 'text-amber-600' : 'text-slate-500'}>
                Balance: {fromBalance} {fromToken}
                {ethBalanceLoading && fromToken === 'ETH' && ' ⏳'}
                {usdcBalanceLoading && fromToken === 'USDC' && ' ⏳'}
                {wethBalanceLoading && fromToken === 'WETH' && ' ⏳'}
              </span>
              {ethBalanceError && fromToken === 'ETH' && (
                <button
                  onClick={() => refetchEthBalance()}
                  className="text-blue-600 hover:text-blue-700 text-xs underline"
                  title="Retry fetching balance"
                >
                  Retry
                </button>
              )}
              {usdcBalanceError && fromToken === 'USDC' && (
                <button
                  onClick={() => refetchUsdcBalance()}
                  className="text-blue-600 hover:text-blue-700 text-xs underline"
                  title="Retry fetching balance"
                >
                  Retry
                </button>
              )}
              {wethBalanceError && fromToken === 'WETH' && (
                <button
                  onClick={() => refetchWethBalance()}
                  className="text-blue-600 hover:text-blue-700 text-xs underline"
                  title="Retry fetching balance"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              className="flex-1 bg-transparent text-2xl font-semibold text-slate-900 outline-none placeholder:text-slate-300"
            />
            <select
              value={fromToken}
              onChange={(e) => { 
                setFromToken(e.target.value);
                // 不要立即 reset，让错误信息保持显示
              }}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TOKEN_LIST.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 交换按钮 */}
        <div className="flex justify-center -my-1">
          <button
            onClick={flipTokens}
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition shadow-sm"
          >
            <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
            </svg>
          </button>
        </div>

        {/* To */}
        <div className="bg-slate-50 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Receive</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex-1 text-2xl font-semibold text-slate-400">
              {quote ? quote.expectedOutput : '0.0'}
            </div>
            <select
              value={toToken}
              onChange={(e) => { 
                setToToken(e.target.value);
                // 不要立即 reset，让错误信息保持显示
              }}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TOKEN_LIST.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Trade info */}
        {amount && parseFloat(amount) > 0 && (
          <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Price</span>
              <span className="text-slate-700 font-medium">
                1 {fromToken} = {price ? (price < 0.01 ? price.toFixed(6) : price.toLocaleString(undefined, { maximumFractionDigits: 2 })) : '?'} {toToken}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Route</span>
              <span className="text-slate-700 font-medium">
                {fromToken} &rarr; ComplianceHook &rarr; {toToken}
              </span>
            </div>
            {toToken === 'ETH' && (
              <div className="text-amber-600">
                Note: ETH output is auto-unwrapped from WETH after swap.
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Slippage Tolerance</span>
              <span className="text-slate-700 font-medium">{slippage / 100}%</span>
            </div>
            {quote && (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-500">Price Impact</span>
                  <span className="text-slate-700 font-medium">{quote.priceImpact}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Est. Gas</span>
                  <span className="text-slate-700 font-medium">{quote.estimatedGas}</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* 错误 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <div className="flex items-start justify-between space-x-2">
              <p className="text-xs text-red-700 flex-1">{error}</p>
              <button
                onClick={reset}
                className="text-red-400 hover:text-red-600 transition"
                aria-label="Close error"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Success */}
        {status === 'success' && txHash && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-1">
            <p className="text-xs text-emerald-700 font-medium">Transaction sent</p>
            <a
              href={`https://sepolia.basescan.org/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-emerald-600 underline"
            >
              View on Basescan
            </a>
            {lastSwapDelta && (
              <p className="text-xs text-emerald-700">
                On-chain change: {lastSwapDelta.fromToken} {lastSwapDelta.fromDelta} / {lastSwapDelta.toToken}{' '}
                {lastSwapDelta.toDelta}
              </p>
            )}
          </div>
        )}

        {/* 交易按钮 */}
        <button
          onClick={handleSwap}
          disabled={
            !amount ||
            parseFloat(amount) <= 0 ||
            status === 'swapping' ||
            status === 'confirming' ||
            fromToken === toToken
          }
          className="w-full py-3.5 rounded-xl font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-sm hover:shadow"
        >
          {status === 'signing'
            ? 'Sign permit...'
            : status === 'approving'
              ? 'Approving token...'
              : status === 'swapping'
                ? 'Sending transaction...'
                : status === 'confirming'
                  ? 'Confirming...'
                  : fromToken === toToken
                    ? 'Select different tokens'
                    : !amount || parseFloat(amount) <= 0
                      ? 'Enter amount'
                      : 'Swap'}
        </button>
      </div>

      {/* Info */}
      <div className="card p-4">
        <p className="text-xs text-slate-500 leading-relaxed">
          All trades are compliance-verified through Uniswap v4 ComplianceHook.
          Your identity is protected by zero-knowledge proofs and is never disclosed on-chain.
          Currently running on Base Sepolia testnet.
        </p>
      </div>
    </div>
  );
}
