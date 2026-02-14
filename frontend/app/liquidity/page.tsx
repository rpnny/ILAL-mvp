'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useSession } from '@/hooks/useSession';
import { useLiquidity, formatFee, tickToPrice, priceToTick, type Pool, type Position } from '@/hooks/useLiquidity';
import Link from 'next/link';

export default function LiquidityPage() {
  const { isConnected } = useAccount();
  const { isActive, timeRemainingFormatted } = useSession();
  const { 
    pools, 
    positions, 
    lastLiquidityDelta,
    status, 
    error, 
    txHash, 
    loading,
    addLiquidity, 
    removeLiquidity, 
    reset 
  } = useLiquidity();

  const [selectedPool, setSelectedPool] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pools' | 'positions'>('pools');
  
  // 添加流动性表单
  const [addForm, setAddForm] = useState({
    token0Amount: '',
    token1Amount: '',
    priceLower: '',
    priceUpper: '',
  });

  // 移除流动性表单
  const [removePercent, setRemovePercent] = useState(100);
  const [selectedPosition, setSelectedPosition] = useState<bigint | null>(null);

  // 重置错误
  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => {
        reset();
        setAddForm({ token0Amount: '', token1Amount: '', priceLower: '', priceUpper: '' });
        setSelectedPool(null);
        setSelectedPosition(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status, reset]);

  if (!isConnected) {
    return (
      <div className="max-w-lg mx-auto p-6 mt-12">
        <div className="card p-8 text-center space-y-4">
          <h1 className="text-2xl font-bold text-slate-900">Liquidity</h1>
          <p className="text-slate-500 text-sm">Please connect your wallet first</p>
          <div className="flex justify-center"><ConnectButton /></div>
        </div>
      </div>
    );
  }

  if (!isActive) {
    return (
      <div className="max-w-lg mx-auto p-6 mt-12">
        <div className="card p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Verification Required</h2>
          <p className="text-sm text-slate-500">Connect your wallet and complete verification to add liquidity</p>
          <Link href="/" className="inline-block w-full py-3 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 transition text-center">
            Go to Verification
          </Link>
        </div>
      </div>
    );
  }

  const handleAddLiquidity = async (pool: Pool) => {
    console.log('[LiquidityPage] handleAddLiquidity called', { pool: pool.id, form: addForm });
    
    if (!addForm.token0Amount || !addForm.token1Amount) {
      console.warn('[LiquidityPage] Missing amounts');
      return;
    }

    try {
      const alignTick = (tick: number) => Math.floor(tick / pool.tickSpacing) * pool.tickSpacing;
      const maxUsableTick = Math.floor(887272 / pool.tickSpacing) * pool.tickSpacing;
      const defaultRange = pool.tickSpacing * 50; // 默认在当前价格附近提供流动性，避免 full-range 资金需求过大
      const tickLower = addForm.priceLower 
        ? priceToTick(parseFloat(addForm.priceLower), pool.tickSpacing)
        : Math.max(-maxUsableTick, alignTick(pool.tick - defaultRange));
      const tickUpper = addForm.priceUpper
        ? priceToTick(parseFloat(addForm.priceUpper), pool.tickSpacing)
        : Math.min(maxUsableTick, alignTick(pool.tick + defaultRange));

      if (tickLower >= tickUpper) {
        console.warn('[LiquidityPage] Invalid tick range', { tickLower, tickUpper });
        return;
      }

      console.log('[LiquidityPage] Tick range:', { tickLower, tickUpper });

      const success = await addLiquidity({
        poolId: pool.id,
        token0Amount: addForm.token0Amount,
        token1Amount: addForm.token1Amount,
        tickLower,
        tickUpper,
        slippage: 50, // 0.5%
      });

      console.log('[LiquidityPage] Add liquidity result:', success);
    } catch (err) {
      console.error('[LiquidityPage] Error in handleAddLiquidity:', err);
    }
  };

  const handleRemoveLiquidity = async () => {
    if (!selectedPosition) return;

    await removeLiquidity({
      tokenId: selectedPosition,
      liquidityPercent: removePercent,
      slippage: 50,
    });
  };

  const totalTVL = pools.reduce((sum, p) => {
    const tvl = parseFloat(p.tvl.replace(/[$,]/g, ''));
    return sum + tvl;
  }, 0);

  const totalVolume = pools.reduce((sum, p) => {
    const vol = parseFloat(p.volume24h.replace(/[$,]/g, ''));
    return sum + vol;
  }, 0);

  return (
    <div className="max-w-3xl mx-auto p-6 mt-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Compliant Liquidity Pools</h1>
          <p className="text-sm text-slate-500 mt-1">
            Compliance liquidity pools for verified users only
          </p>
        </div>
        <div className="flex items-center space-x-1.5 text-xs text-emerald-600 bg-emerald-50 rounded-full px-3 py-1.5 border border-emerald-200">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{timeRemainingFormatted}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <p className="text-xs text-slate-500">TVL</p>
          <p className="text-lg font-bold text-slate-900 mt-1">
            ${totalTVL.toLocaleString()}
          </p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-slate-500">24h Volume</p>
          <p className="text-lg font-bold text-slate-900 mt-1">
            ${totalVolume.toLocaleString()}
          </p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-slate-500">My Positions</p>
          <p className="text-lg font-bold text-slate-900 mt-1">{positions.length}</p>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="flex space-x-2">
        <button
          onClick={() => setActiveTab('pools')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'pools'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Pool List
        </button>
        <button
          onClick={() => setActiveTab('positions')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'positions'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          My Positions ({positions.length})
        </button>
      </div>

      {/* 状态提示 */}
      {status !== 'idle' && status !== 'success' && status !== 'error' && (
        <div className="card p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center space-x-3">
            <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full" />
            <span className="text-sm text-blue-700">
              {status === 'signing' && 'Please sign in your wallet...'}
              {status === 'approving' && 'Approving...'}
              {status === 'adding' && 'Adding liquidity...'}
              {status === 'removing' && 'Removing liquidity...'}
              {status === 'confirming' && 'Waiting for confirmation...'}
            </span>
          </div>
        </div>
      )}

      {status === 'success' && (
        <div className="card p-4 bg-emerald-50 border-emerald-200">
          <div className="flex items-center space-x-3">
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            <span className="text-sm text-emerald-700">Operation successful!</span>
            {txHash && (
              <a
                href={`https://sepolia.basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-emerald-600 underline"
              >
                View transaction
              </a>
            )}
          </div>
          {lastLiquidityDelta && (
            <p className="mt-2 text-xs text-emerald-700">
              On-chain change: {lastLiquidityDelta.token0} {lastLiquidityDelta.token0Delta} / {lastLiquidityDelta.token1}{' '}
              {lastLiquidityDelta.token1Delta}
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="card p-4 bg-red-50 border-red-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-red-700">{error}</span>
            <button onClick={reset} className="text-xs text-red-600 underline">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* 池子列表 */}
      {activeTab === 'pools' && (
        <div className="space-y-3">
          {loading ? (
            <div className="card p-8 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
              <p className="text-sm text-slate-500 mt-3">Loading...</p>
            </div>
          ) : (
            pools.map((pool) => (
              <div
                key={pool.id}
                className={`card p-5 ${
                  selectedPool === pool.id ? 'ring-2 ring-blue-500 border-blue-200' : ''
                }`}
              >
                <div 
                  className="flex items-center justify-between cursor-pointer hover:opacity-80 transition"
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('[LiquidityPage] Toggle pool', pool.id);
                    setSelectedPool(selectedPool === pool.id ? null : pool.id);
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {pool.token0.symbol[0]}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">
                        {pool.token0.symbol} / {pool.token1.symbol}
                      </p>
                      <div className="flex items-center space-x-2 mt-0.5">
                        <span className="text-xs text-slate-500">Fee {formatFee(pool.fee)}</span>
                        {pool.verified && (
                          <span className="text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                            Verified
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{pool.tvl}</p>
                    <p className="text-xs text-emerald-600 font-medium">APR {pool.apr}</p>
                  </div>
                </div>

                {/* Expanded details */}
                {selectedPool === pool.id && (
                  <div 
                    className="mt-4 pt-4 border-t border-slate-100 space-y-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500 text-xs">24h Volume</p>
                        <p className="font-medium text-slate-800">{pool.volume24h}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs">Fee</p>
                        <p className="font-medium text-slate-800">{formatFee(pool.fee)}</p>
                      </div>
                    </div>

                    {/* Add liquidity form */}
                    <div className="space-y-3 pt-2">
                      <p className="text-sm font-medium text-slate-700">Add Liquidity</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-slate-500">{pool.token0.symbol} Amount</label>
                          <input
                            type="number"
                            value={addForm.token0Amount}
                            onChange={(e) => setAddForm(f => ({ ...f, token0Amount: e.target.value }))}
                            className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0.0"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500">{pool.token1.symbol} Amount</label>
                          <input
                            type="number"
                            value={addForm.token1Amount}
                            onChange={(e) => setAddForm(f => ({ ...f, token1Amount: e.target.value }))}
                            className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0.0"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-slate-500">Min Price</label>
                          <input
                            type="number"
                            value={addForm.priceLower}
                            onChange={(e) => setAddForm(f => ({ ...f, priceLower: e.target.value }))}
                            className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Full range"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500">Max Price</label>
                          <input
                            type="number"
                            value={addForm.priceUpper}
                            onChange={(e) => setAddForm(f => ({ ...f, priceUpper: e.target.value }))}
                            className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Full range"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddLiquidity(pool)}
                        disabled={status !== 'idle' || !addForm.token0Amount || !addForm.token1Amount}
                        className="w-full py-2.5 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {status !== 'idle' ? 'Processing...' : 'Add Liquidity'}
                      </button>
                    </div>

                    <p className="text-xs text-slate-400">
                      Note: LP NFTs are non-transferable; only the original provider can manage them.
                      This is ILAL's compliance measure.
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* 我的持仓 */}
      {activeTab === 'positions' && (
        <div className="space-y-3">
          {positions.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-slate-500">No positions yet</p>
              <button
                onClick={() => setActiveTab('pools')}
                className="mt-4 text-sm text-blue-600 hover:underline"
              >
                Add liquidity
              </button>
            </div>
          ) : (
            positions.map((position) => (
              <div
                key={position.tokenId.toString()}
                className={`card p-5 ${
                  selectedPosition === position.tokenId ? 'ring-2 ring-blue-500 border-blue-200' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">
                      Position #{position.tokenId.toString()}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Price range: {tickToPrice(position.tickLower).toFixed(2)} - {tickToPrice(position.tickUpper).toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">
                      {position.liquidity.toString()} LP
                    </p>
                  </div>
                </div>

                {/* Remove liquidity */}
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                  <div>
                    <label className="text-xs text-slate-500">Remove: {removePercent}%</label>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={removePercent}
                      onChange={(e) => setRemovePercent(parseInt(e.target.value))}
                      className="w-full mt-2"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                      <span>1%</span>
                      <span>25%</span>
                      <span>50%</span>
                      <span>75%</span>
                      <span>100%</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedPosition(position.tokenId);
                      handleRemoveLiquidity();
                    }}
                    disabled={status !== 'idle'}
                    className="w-full py-2.5 rounded-lg font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition text-sm disabled:opacity-50"
                  >
                    {status !== 'idle' ? 'Processing...' : `Remove ${removePercent}% Liquidity`}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Info */}
      <div className="card p-4">
        <p className="text-xs text-slate-500 leading-relaxed">
          Compliant liquidity pools are protected by Uniswap v4 ComplianceHook. Only users who pass ZK verification
          can trade and provide liquidity. LP NFTs are bound to the original address and are non-transferable to ensure compliance.
        </p>
      </div>
    </div>
  );
}
