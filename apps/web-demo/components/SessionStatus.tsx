'use client';

import { useSession } from '@/hooks/useSession';
import { useAccount } from 'wagmi';

/**
 * 会话状态显示组件
 */
export function SessionStatus() {
  const { address } = useAccount();
  const { isActive, timeRemainingFormatted, refresh } = useSession();

  // Debug log
  console.log('SessionStatus - address:', address, 'isActive:', isActive, 'timeRemaining:', timeRemainingFormatted);

  if (!address) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 bg-white rounded-lg shadow-lg p-4 min-w-[280px]">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-800">Verification Status</h3>
        <button
          onClick={refresh}
          className="text-gray-500 hover:text-gray-700 transition"
          title="Refresh"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {isActive ? (
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse" />
          <div>
            <p className="text-sm text-gray-600">Verified</p>
            <p className="text-xs text-gray-500">Remaining: {timeRemainingFormatted}</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center">
          <div className="w-3 h-3 bg-red-500 rounded-full mr-2" />
          <div>
            <p className="text-sm text-gray-600">Not verified</p>
            <a href="/verify" className="text-xs text-blue-600 hover:underline">
              Verify now →
            </a>
          </div>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-500 truncate">
          {address.slice(0, 6)}...{address.slice(-4)}
        </p>
      </div>
    </div>
  );
}
