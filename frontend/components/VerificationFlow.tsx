'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useVerification } from '@/hooks/useVerification';
import { useSession } from '@/hooks/useSession';

/**
 * 验证流程组件
 */
export function VerificationFlow() {
  const { address, isConnected } = useAccount();
  const { verify, isVerifying, progress, error } = useVerification();
  const { isActive, timeRemainingFormatted, refresh } = useSession();

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 pt-20">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold mb-4">欢迎使用 ILAL</h1>
          <p className="text-gray-600 mb-6">
            请先连接您的钱包以继续
          </p>
          <div className="flex justify-center">
            <ConnectButton />
          </div>
        </div>
      </div>
    );
  }

  if (isActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 pt-20">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          <h2 className="text-xl font-bold text-center mb-2">身份验证成功</h2>
          <p className="text-gray-600 text-center mb-6">
            您已通过验证，可以开始交易
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">会话剩余时间：</span>
              <span className="text-blue-600">{timeRemainingFormatted}</span>
            </p>
            <p className="text-sm text-gray-500 mt-2">
              过期后需要重新验证
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={refresh}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-4 rounded-lg transition"
            >
              刷新状态
            </button>
            <button
              onClick={() => window.location.href = '/trade'}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition"
            >
              开始交易
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 pt-20">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-xl font-bold mb-4">验证您的身份</h2>

        <div className="mb-6">
          <div className="flex items-center mb-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
              <span className="text-blue-600 font-bold">1</span>
            </div>
            <p className="text-gray-700">检查 Coinbase 验证状态</p>
          </div>

          <div className="flex items-center mb-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
              <span className="text-blue-600 font-bold">2</span>
            </div>
            <p className="text-gray-700">生成零知识证明</p>
          </div>

          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
              <span className="text-blue-600 font-bold">3</span>
            </div>
            <p className="text-gray-700">提交链上验证</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <button
          onClick={verify}
          disabled={isVerifying}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg transition font-semibold"
        >
          {isVerifying ? `验证中... ${progress}%` : '开始验证'}
        </button>

        {isVerifying && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <p className="text-xs text-gray-500 mt-4 text-center">
          验证通过后，会话将在 24 小时内有效
        </p>
      </div>
    </div>
  );
}
