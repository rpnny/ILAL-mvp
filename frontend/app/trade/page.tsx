'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useSession } from '@/hooks/useSession';
import { SessionStatus } from '@/components/SessionStatus';

export default function TradePage() {
  const { address, isConnected } = useAccount();
  const { isActive, timeRemainingFormatted } = useSession();

  const [fromToken, setFromToken] = useState('ETH');
  const [toToken, setToToken] = useState('USDC');
  const [amount, setAmount] = useState('');
  const [isSwapping, setIsSwapping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 等待 Wagmi 初始化完成
  useEffect(() => {
    // 缩短加载时间到 100ms，然后立即检查状态
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // 如果已经有地址，立即结束加载
  useEffect(() => {
    if (address) {
      setIsLoading(false);
    }
  }, [address]);

  // Debug log
  console.log('Trade page - isConnected:', isConnected, 'isActive:', isActive, 'address:', address);

  const handleSwap = async () => {
    if (!isActive) {
      alert('请先验证身份');
      return;
    }

    setIsSwapping(true);

    try {
      // TODO: 实际 Swap 逻辑
      // 1. 生成 EIP-712 签名
      // 2. 构造 hookData
      // 3. 调用 UniversalRouter.swap

      await new Promise((resolve) => setTimeout(resolve, 2000)); // 模拟

      alert('交易成功!');
    } catch (error) {
      console.error('交易失败:', error);
      alert('交易失败');
    } finally {
      setIsSwapping(false);
    }
  };

  // 加载中状态
  if (isLoading) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-8 pt-20">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </main>
    );
  }

  // 未连接钱包
  if (!isConnected || !address) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-8 pt-20">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold mb-4">ILAL 交易</h1>
          <p className="text-gray-600 mb-6">请先连接钱包</p>
          <a
            href="/"
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center py-3 px-4 rounded-lg transition font-semibold"
          >
            返回首页连接钱包
          </a>
        </div>
      </main>
    );
  }

  if (!isActive) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-8 pt-20">
        <SessionStatus />
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 mt-4">
          <h2 className="text-xl font-bold mb-4">需要验证身份</h2>
          <p className="text-gray-600 mb-6">
            您需要先完成身份验证才能开始交易
          </p>
          <a
            href="/"
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center py-3 px-4 rounded-lg transition font-semibold"
          >
            立即验证
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8 bg-gray-50 pt-20">
      <SessionStatus />

      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-6">ILAL 交易</h1>

        {/* 会话状态提示 */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-green-700">
            ✅ 身份已验证 · 剩余 {timeRemainingFormatted}
          </p>
        </div>

        {/* 交易表单 */}
        <div className="space-y-4">
          {/* From Token */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              支付
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={fromToken}
                onChange={(e) => setFromToken(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ETH">ETH</option>
                <option value="USDC">USDC</option>
                <option value="WBTC">WBTC</option>
              </select>
            </div>
          </div>

          {/* 交换图标 */}
          <div className="flex justify-center">
            <button
              onClick={() => {
                setFromToken(toToken);
                setToToken(fromToken);
              }}
              className="p-2 hover:bg-gray-100 rounded-full transition"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>
          </div>

          {/* To Token */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              接收
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value="~0.0"
                disabled
                className="flex-1 border border-gray-300 rounded-lg px-4 py-3 bg-gray-50 text-gray-500"
              />
              <select
                value={toToken}
                onChange={(e) => setToToken(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="USDC">USDC</option>
                <option value="ETH">ETH</option>
                <option value="WBTC">WBTC</option>
              </select>
            </div>
          </div>

          {/* 交易信息 */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">价格</span>
              <span className="text-gray-900">1 {fromToken} = ? {toToken}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">滑点容差</span>
              <span className="text-gray-900">0.5%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">预估 Gas</span>
              <span className="text-gray-900">~$2.50</span>
            </div>
          </div>

          {/* 交易按钮 */}
          <button
            onClick={handleSwap}
            disabled={isSwapping || !amount}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-4 px-4 rounded-lg transition font-semibold text-lg"
          >
            {isSwapping ? '交易中...' : '交易'}
          </button>
        </div>

        {/* 提示信息 */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700">
            💡 <strong>提示:</strong> 所有交易都会通过 Uniswap v4 Hook 进行合规验证。
            您的身份信息通过零知识证明保护，不会在链上公开。
          </p>
        </div>
      </div>
    </main>
  );
}
