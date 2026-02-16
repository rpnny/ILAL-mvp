'use client';

import { useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useSession } from '@/hooks/useSession';
import { useHistory, type TxRecord } from '@/hooks/useHistory';
import { getContractAddresses } from '@/lib/contracts';

export default function HistoryPage() {
  const { address, isConnected, chainId } = useAccount();
  const { isActive } = useSession();
  const { records, loading, error, refresh } = useHistory();
  const [filter, setFilter] = useState<string>('all');

  const filteredRecords = useMemo(() => {
    if (filter === 'all') return records;
    return records.filter(r => r.type === filter);
  }, [records, filter]);

  const addresses = chainId ? getContractAddresses(chainId) : null;

  // 统计数据
  const stats = useMemo(() => {
    const swaps = records.filter(r => r.type === 'swap').length;
    const verifications = records.filter(r => r.type === 'verify').length;
    const sessions = records.filter(r => r.type === 'session').length;
    const liquidity = records.filter(r => r.type === 'liquidity').length;
    return { swaps, verifications, sessions, liquidity, total: records.length };
  }, [records]);

  if (!isConnected) {
    return (
      <div className="max-w-lg mx-auto p-6 mt-12">
        <div className="card p-8 text-center space-y-4">
          <h1 className="text-2xl font-bold text-slate-900">Transaction History</h1>
          <p className="text-slate-500 text-sm">Please connect your wallet first</p>
          <div className="flex justify-center"><ConnectButton /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 mt-8 space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Transaction History</h1>
        <div className="flex items-center space-x-3">
          <button
            onClick={refresh}
            disabled={loading}
            className="text-xs text-blue-600 hover:underline disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <div className="text-xs text-slate-500">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-3">
        <div className="card p-3 text-center">
          <p className="text-xs text-slate-500">Total</p>
          <p className="text-lg font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs text-slate-500">Swap</p>
          <p className="text-lg font-bold text-blue-600">{stats.swaps}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs text-slate-500">Verification</p>
          <p className="text-lg font-bold text-purple-600">{stats.verifications}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs text-slate-500">Liquidity</p>
          <p className="text-lg font-bold text-amber-600">{stats.liquidity}</p>
        </div>
      </div>

      {/* 合约信息 */}
      {addresses && (
        <div className="card p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-800">Deployed Contracts</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <ContractLink label="Registry" address={addresses.registry} chainId={chainId} />
            <ContractLink label="SessionManager" address={addresses.sessionManager} chainId={chainId} />
            <ContractLink label="Verifier" address={addresses.verifier} chainId={chainId} />
            <ContractLink label="ComplianceHook" address={addresses.complianceHook} chainId={chainId} />
          </div>
        </div>
      )}

      {/* 筛选 */}
      <div className="flex space-x-2">
        {[
          { key: 'all', label: 'All' },
          { key: 'swap', label: 'Swap' },
          { key: 'verify', label: 'Verification' },
          { key: 'session', label: 'Session' },
          { key: 'liquidity', label: 'Liquidity' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filter === f.key
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-slate-500 hover:bg-slate-50 border border-transparent'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="card p-4 bg-red-50 border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* 加载状态 */}
      {loading && records.length === 0 && (
        <div className="card p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-slate-500 mt-3">Loading history...</p>
        </div>
      )}

      {/* 历史列表 */}
      {!loading && filteredRecords.length === 0 ? (
        <div className="card p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-slate-500">No transaction records yet</p>
          <p className="text-xs text-slate-400">Complete verification to start trading</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredRecords.map((record) => (
            <RecordItem key={record.id} record={record} chainId={chainId} />
          ))}
        </div>
      )}

      {/* Session 状态 */}
      <div className="card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-slate-800">Current Session</h3>
        <div className="flex items-center space-x-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
            }`}
          />
          <span className={`text-sm font-medium ${isActive ? 'text-emerald-700' : 'text-slate-500'}`}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============ 子组件 ============

function RecordItem({ record, chainId }: { record: TxRecord; chainId?: number }) {
  const explorerUrl = chainId === 8453 
    ? 'https://basescan.org' 
    : 'https://sepolia.basescan.org';

  return (
    <div className="card p-4 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <TypeIcon type={record.type} status={record.status} />
        <div>
          <p className="text-sm font-medium text-slate-800">
            {record.description}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {record.detail}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-xs text-slate-500">{record.time}</p>
        {record.txHash && (
          <a
            href={`${explorerUrl}/tx/${record.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-500 hover:underline"
          >
            View
          </a>
        )}
      </div>
    </div>
  );
}

function TypeIcon({ type, status }: { type: string; status: string }) {
  const colors = {
    swap: 'bg-blue-100 text-blue-600',
    verify: 'bg-purple-100 text-purple-600',
    session: 'bg-emerald-100 text-emerald-600',
    liquidity: 'bg-amber-100 text-amber-600',
  };

  const color = colors[type as keyof typeof colors] || 'bg-slate-100 text-slate-600';

  return (
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
      {type === 'swap' && (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
        </svg>
      )}
      {type === 'verify' && (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      )}
      {type === 'session' && (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
      {type === 'liquidity' && (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
        </svg>
      )}
    </div>
  );
}

function ContractLink({ label, address, chainId }: { label: string; address: string; chainId?: number }) {
  const explorerUrl = chainId === 8453 
    ? 'https://basescan.org' 
    : 'https://sepolia.basescan.org';

  return (
    <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
      <span className="text-slate-600">{label}</span>
      <a
        href={`${explorerUrl}/address/${address}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 hover:underline font-mono"
      >
        {address.slice(0, 6)}...{address.slice(-4)}
      </a>
    </div>
  );
}
