'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useSession } from '@/hooks/useSession';
import { useSwap, TOKENS } from '@/hooks/useSwap';
import Link from 'next/link';

const TOKEN_LIST = Object.keys(TOKENS);

export default function TradePage() {
  const { address, isConnected } = useAccount();
  const { isActive, timeRemainingFormatted } = useSession();
  const { status, error, txHash, quote, getQuote, executeSwap, reset, getPrice } = useSwap();

  const [fromToken, setFromToken] = useState('ETH');
  const [toToken, setToToken] = useState('USDC');
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState(50); // 0.5%

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
    const success = await executeSwap({ fromToken, toToken, amount, slippage });
    if (success) {
      setAmount('');
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

  const price = getPrice(fromToken, toToken);

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
          <div className="flex justify-between text-xs text-slate-500">
            <span>Pay</span>
            <span>Balance: --</span>
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
              onChange={(e) => { setFromToken(e.target.value); reset(); }}
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
              onChange={(e) => { setToToken(e.target.value); reset(); }}
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
                1 {fromToken} = {price ? price.toLocaleString() : '?'} {toToken}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Route</span>
              <span className="text-slate-700 font-medium">
                {fromToken} &rarr; ComplianceHook &rarr; {toToken}
              </span>
            </div>
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
            <p className="text-xs text-red-700">{error}</p>
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
          {status === 'swapping'
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
