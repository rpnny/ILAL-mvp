'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount, usePublicClient, useChainId } from 'wagmi';
import { type Address, formatUnits, parseAbiItem } from 'viem';
import { getContractAddresses } from '@/lib/contracts';

// ============ 类型 ============

export interface TxRecord {
  id: string;
  type: 'swap' | 'verify' | 'session' | 'liquidity';
  status: 'success' | 'pending' | 'failed';
  description: string;
  detail: string;
  time: string;
  timestamp: number;
  txHash: string;
  blockNumber: string;
}

// ============ 事件签名 ============

const EVENTS = {
  // Registry 事件
  UserVerified: parseAbiItem('event UserVerified(address indexed user, bytes32 indexed proofHash, uint256 expiry)'),
  
  // SessionManager 事件
  SessionStarted: parseAbiItem('event SessionStarted(address indexed user, uint256 expiry)'),
  SessionEnded: parseAbiItem('event SessionEnded(address indexed user)'),
  
  // ComplianceHook 事件 (Swap)
  SwapExecuted: parseAbiItem('event SwapExecuted(address indexed user, address indexed pool, int256 amount0, int256 amount1)'),
  
  // PositionManager 事件 (Liquidity)
  PositionMinted: parseAbiItem('event PositionMinted(uint256 indexed tokenId, address indexed owner, uint128 liquidity)'),
  LiquidityIncreased: parseAbiItem('event LiquidityIncreased(uint256 indexed tokenId, uint128 liquidityDelta)'),
  LiquidityDecreased: parseAbiItem('event LiquidityDecreased(uint256 indexed tokenId, uint128 liquidityDelta)'),
} as const;

// ============ Hook ============

export function useHistory() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const chainId = useChainId();
  
  const [records, setRecords] = useState<TxRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addresses = chainId ? getContractAddresses(chainId) : null;

  /**
   * 格式化时间
   */
  const formatTime = useCallback((timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp * 1000;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    
    return new Date(timestamp * 1000).toLocaleDateString('en-US');
  }, []);

  /**
   * 获取区块时间戳
   */
  const getBlockTimestamp = useCallback(async (blockNumber: bigint): Promise<number> => {
    if (!publicClient) return Math.floor(Date.now() / 1000);
    
    try {
      const block = await publicClient.getBlock({ blockNumber });
      return Number(block.timestamp);
    } catch {
      return Math.floor(Date.now() / 1000);
    }
  }, [publicClient]);

  /**
   * 获取验证事件
   */
  const fetchVerificationEvents = useCallback(async (): Promise<TxRecord[]> => {
    if (!publicClient || !address || !addresses) return [];

    try {
      const logs = await publicClient.getLogs({
        address: addresses.registry as Address,
        event: EVENTS.UserVerified,
        args: { user: address },
        fromBlock: 'earliest',
        toBlock: 'latest',
      });

      const records: TxRecord[] = [];
      
      for (const log of logs) {
        const timestamp = await getBlockTimestamp(log.blockNumber);
        records.push({
          id: `verify-${log.transactionHash}`,
          type: 'verify',
          status: 'success',
          description: 'ZK Identity Verification',
          detail: 'PLONK Proof submitted and verified',
          time: formatTime(timestamp),
          timestamp,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber.toString(),
        });
      }

      return records;
    } catch (err) {
      console.error('Failed to fetch verification events:', err);
      return [];
    }
  }, [publicClient, address, addresses, getBlockTimestamp, formatTime]);

  /**
   * 获取 Session 事件
   */
  const fetchSessionEvents = useCallback(async (): Promise<TxRecord[]> => {
    if (!publicClient || !address || !addresses) return [];

    try {
      const [startLogs, endLogs] = await Promise.all([
        publicClient.getLogs({
          address: addresses.sessionManager as Address,
          event: EVENTS.SessionStarted,
          args: { user: address },
          fromBlock: 'earliest',
          toBlock: 'latest',
        }),
        publicClient.getLogs({
          address: addresses.sessionManager as Address,
          event: EVENTS.SessionEnded,
          args: { user: address },
          fromBlock: 'earliest',
          toBlock: 'latest',
        }),
      ]);

      const records: TxRecord[] = [];

      for (const log of startLogs) {
        const timestamp = await getBlockTimestamp(log.blockNumber);
        const expiry = log.args.expiry;
        const duration = expiry ? Number(expiry) - timestamp : 86400;
        const hours = Math.floor(duration / 3600);
        
        records.push({
          id: `session-start-${log.transactionHash}`,
          type: 'session',
          status: 'success',
          description: 'Session Activated',
          detail: `Valid for ${hours} hours`,
          time: formatTime(timestamp),
          timestamp,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber.toString(),
        });
      }

      for (const log of endLogs) {
        const timestamp = await getBlockTimestamp(log.blockNumber);
        records.push({
          id: `session-end-${log.transactionHash}`,
          type: 'session',
          status: 'success',
          description: 'Session Ended',
          detail: 'Manually ended or expired',
          time: formatTime(timestamp),
          timestamp,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber.toString(),
        });
      }

      return records;
    } catch (err) {
      console.error('Failed to fetch session events:', err);
      return [];
    }
  }, [publicClient, address, addresses, getBlockTimestamp, formatTime]);

  /**
   * 获取交易历史（从 Transfer 事件推断）
   */
  const fetchSwapEvents = useCallback(async (): Promise<TxRecord[]> => {
    if (!publicClient || !address || !addresses) return [];

    // 由于 ComplianceHook 可能没有 SwapExecuted 事件，
    // 我们尝试从 ERC20 Transfer 事件推断交易
    // 这里简化处理，实际应该从子图获取

    try {
      // 尝试获取 ComplianceHook 的 SwapExecuted 事件
      const logs = await publicClient.getLogs({
        address: addresses.complianceHook as Address,
        event: EVENTS.SwapExecuted,
        args: { user: address },
        fromBlock: 'earliest',
        toBlock: 'latest',
      });

      const records: TxRecord[] = [];

      for (const log of logs) {
        const timestamp = await getBlockTimestamp(log.blockNumber);
        const amount0 = log.args.amount0 || 0n;
        const amount1 = log.args.amount1 || 0n;
        const abs0 = amount0 < 0n ? -amount0 : amount0;
        const abs1 = amount1 < 0n ? -amount1 : amount1;
        
        records.push({
          id: `swap-${log.transactionHash}`,
          type: 'swap',
          status: 'success',
          description: 'Swap Transaction',
          detail: `${formatUnits(abs0, 18)} → ${formatUnits(abs1, 6)}`,
          time: formatTime(timestamp),
          timestamp,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber.toString(),
        });
      }

      return records;
    } catch (err) {
      // 事件可能不存在，静默失败
      console.debug('No swap events found:', err);
      return [];
    }
  }, [publicClient, address, addresses, getBlockTimestamp, formatTime]);

  /**
   * 获取流动性事件
   */
  const fetchLiquidityEvents = useCallback(async (): Promise<TxRecord[]> => {
    if (!publicClient || !address || !addresses) return [];

    try {
      // 获取 PositionMinted 事件
      const mintLogs = await publicClient.getLogs({
        address: addresses.positionManager as Address,
        event: EVENTS.PositionMinted,
        args: { owner: address },
        fromBlock: 'earliest',
        toBlock: 'latest',
      });

      const records: TxRecord[] = [];

      for (const log of mintLogs) {
        const timestamp = await getBlockTimestamp(log.blockNumber);
        const liquidity = log.args.liquidity || 0n;
        
        records.push({
          id: `mint-${log.transactionHash}`,
          type: 'liquidity',
          status: 'success',
          description: 'Add Liquidity',
          detail: `Created Position #${log.args.tokenId?.toString() || '?'}`,
          time: formatTime(timestamp),
          timestamp,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber.toString(),
        });
      }

      return records;
    } catch (err) {
      console.debug('No liquidity events found:', err);
      return [];
    }
  }, [publicClient, address, addresses, getBlockTimestamp, formatTime]);

  /**
   * 获取所有历史记录
   */
  const fetchHistory = useCallback(async () => {
    if (!address || !publicClient) return;

    setLoading(true);
    setError(null);

    try {
      // 并行获取所有事件
      const [verifyRecords, sessionRecords, swapRecords, liquidityRecords] = await Promise.all([
        fetchVerificationEvents(),
        fetchSessionEvents(),
        fetchSwapEvents(),
        fetchLiquidityEvents(),
      ]);

      // 合并并按时间排序
      const allRecords = [
        ...verifyRecords,
        ...sessionRecords,
        ...swapRecords,
        ...liquidityRecords,
      ].sort((a, b) => b.timestamp - a.timestamp);

      // 合并本地记录（总是合并，不只在 allRecords 为空时）
      const stored = localStorage.getItem(`ilal_history_${address}`);
      const localRecords = stored ? (JSON.parse(stored) as TxRecord[]) : [];

      const merged = [...allRecords, ...localRecords].reduce<TxRecord[]>((acc, cur) => {
        const key = `${cur.type}-${cur.txHash}`;
        if (!acc.some(r => `${r.type}-${r.txHash}` === key)) {
          acc.push(cur);
        }
        return acc;
      }, []).sort((a, b) => b.timestamp - a.timestamp);

      setRecords(merged);

      // 缓存到 localStorage
      localStorage.setItem(`ilal_history_${address}`, JSON.stringify(merged));
    } catch (err) {
      console.error('Failed to fetch history:', err);
      setError('Failed to fetch transaction history');
      
      // 尝试从 localStorage 恢复
      const stored = localStorage.getItem(`ilal_history_${address}`);
      if (stored) {
        setRecords(JSON.parse(stored));
      }
    } finally {
      setLoading(false);
    }
  }, [address, publicClient, fetchVerificationEvents, fetchSessionEvents, fetchSwapEvents, fetchLiquidityEvents]);

  /**
   * 添加本地记录（用于即时显示）
   */
  const addLocalRecord = useCallback((record: Omit<TxRecord, 'id' | 'time' | 'timestamp'>) => {
    const timestamp = Math.floor(Date.now() / 1000);
    const newRecord: TxRecord = {
      ...record,
      id: `local-${Date.now()}`,
      time: 'Just now',
      timestamp,
      blockNumber: '0',
    };

    setRecords(prev => {
      const updated = [newRecord, ...prev];
      if (address) {
        localStorage.setItem(`ilal_history_${address}`, JSON.stringify(updated));
      }
      return updated;
    });
  }, [address]);

  /**
   * 刷新历史
   */
  const refresh = useCallback(() => {
    fetchHistory();
  }, [fetchHistory]);

  // 初始加载
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    records,
    loading,
    error,
    refresh,
    addLocalRecord,
  };
}
