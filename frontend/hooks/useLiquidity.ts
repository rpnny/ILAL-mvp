'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount, useWalletClient, usePublicClient, useChainId } from 'wagmi';
import { type Address, type Hex, encodeAbiParameters, formatUnits, parseUnits } from 'viem';
import { useSession } from './useSession';
import { getContractAddresses, complianceHookABI } from '@/lib/contracts';

// ============ 类型 ============

export interface Pool {
  id: string;
  token0: TokenInfo;
  token1: TokenInfo;
  fee: number; // bps
  tickSpacing: number;
  sqrtPriceX96: bigint;
  tick: number;
  liquidity: bigint;
  tvl: string;
  apr: string;
  volume24h: string;
  verified: boolean;
}

export interface TokenInfo {
  address: Address;
  symbol: string;
  decimals: number;
  name: string;
}

export interface Position {
  tokenId: bigint;
  poolId: string;
  tickLower: number;
  tickUpper: number;
  liquidity: bigint;
  token0Amount: string;
  token1Amount: string;
  feesEarned0: string;
  feesEarned1: string;
}

export interface AddLiquidityParams {
  poolId: string;
  token0Amount: string;
  token1Amount: string;
  tickLower: number;
  tickUpper: number;
  slippage: number; // bps
}

export interface RemoveLiquidityParams {
  tokenId: bigint;
  liquidityPercent: number; // 0-100
  slippage: number;
}

export type LiquidityStatus = 
  | 'idle' 
  | 'signing' 
  | 'approving' 
  | 'adding' 
  | 'removing' 
  | 'confirming' 
  | 'success' 
  | 'error';

// ============ Token 定义 ============

const TOKENS: Record<string, TokenInfo> = {
  ETH: {
    address: '0x0000000000000000000000000000000000000000' as Address,
    symbol: 'ETH',
    decimals: 18,
    name: 'Ether',
  },
  WETH: {
    address: '0x4200000000000000000000000000000000000006' as Address,
    symbol: 'WETH',
    decimals: 18,
    name: 'Wrapped Ether',
  },
  USDC: {
    address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address,
    symbol: 'USDC',
    decimals: 6,
    name: 'USD Coin',
  },
};

// ============ 模拟池子数据（将来从子图获取）============

const MOCK_POOLS: Pool[] = [
  {
    id: '0x1',
    token0: TOKENS.WETH,
    token1: TOKENS.USDC,
    fee: 10000, // 1% (活跃 Pool - 2026-02-11部署)
    tickSpacing: 200,
    sqrtPriceX96: 0n,
    tick: 196200, // 当前 tick
    liquidity: 2000000000000n, // 2e12
    tvl: '$9',  // ~2.18 USDC + ~0.00072 WETH @ $3000
    apr: '2.5%',
    volume24h: '$50',
    verified: true,
  },
  {
    id: '0x2',
    token0: TOKENS.WETH,
    token1: TOKENS.USDC,
    fee: 500, // 0.05% (已废弃 - 流动性不足)
    tickSpacing: 10,
    sqrtPriceX96: 0n,
    tick: 196250,
    liquidity: 0n,
    tvl: '$0',
    apr: '0%',
    volume24h: '$0',
    verified: false,
  },
  {
    id: '0x3',
    token0: TOKENS.WETH,
    token1: TOKENS.USDC,
    fee: 3000, // 0.3% (已废弃 - tick=MAX)
    tickSpacing: 60,
    sqrtPriceX96: 0n,
    tick: 887271, // MAX_TICK
    liquidity: 0n,
    tvl: '$0',
    apr: '0%',
    volume24h: '$0',
    verified: false,
  },
];

// ============ EIP-712 类型 ============

const EIP712_DOMAIN = {
  name: 'ILAL ComplianceHook',
  version: '1',
} as const;

const LIQUIDITY_PERMIT_TYPES = {
  LiquidityPermit: [
    { name: 'user', type: 'address' },
    { name: 'deadline', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
  ],
} as const;

// ============ PositionManager ABI ============

const POSITION_MANAGER_ABI = [
  {
    inputs: [
      {
        components: [
          { name: 'currency0', type: 'address' },
          { name: 'currency1', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'tickSpacing', type: 'int24' },
          { name: 'hooks', type: 'address' },
        ],
        name: 'poolKey',
        type: 'tuple',
      },
      { name: 'tickLower', type: 'int24' },
      { name: 'tickUpper', type: 'int24' },
      { name: 'liquidity', type: 'uint128' },
      { name: 'hookData', type: 'bytes' },
    ],
    name: 'mint',
    outputs: [{ name: 'tokenId', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'liquidityDelta', type: 'uint128' },
      { name: 'hookData', type: 'bytes' },
    ],
    name: 'increaseLiquidity',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'liquidityDelta', type: 'uint128' },
      { name: 'hookData', type: 'bytes' },
    ],
    name: 'decreaseLiquidity',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'positions',
    outputs: [
      { name: 'owner', type: 'address' },
      {
        components: [
          { name: 'currency0', type: 'address' },
          { name: 'currency1', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'tickSpacing', type: 'int24' },
          { name: 'hooks', type: 'address' },
        ],
        name: 'poolKey',
        type: 'tuple',
      },
      { name: 'tickLower', type: 'int24' },
      { name: 'tickUpper', type: 'int24' },
      { name: 'liquidity', type: 'uint128' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'index', type: 'uint256' },
    ],
    name: 'tokenOfOwnerByIndex',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// ============ Hook ============

export function useLiquidity() {
  const { address, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { isActive } = useSession();

  const [status, setStatus] = useState<LiquidityStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [pools, setPools] = useState<Pool[]>(MOCK_POOLS);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);

  const addresses = chainId ? getContractAddresses(chainId) : null;

  /**
   * 获取用户当前 nonce
   */
  const getNonce = useCallback(async (): Promise<bigint> => {
    if (!publicClient || !addresses || !address) {
      return 0n;
    }

    try {
      const nonce = await publicClient.readContract({
        address: addresses.complianceHook as Address,
        abi: complianceHookABI,
        functionName: 'getNonce',
        args: [address],
      });
      return nonce as bigint;
    } catch (err) {
      console.error('Failed to get nonce:', err);
      return 0n;
    }
  }, [publicClient, addresses, address]);

  /**
   * 生成 EIP-712 签名
   */
  const signLiquidityPermit = useCallback(async (): Promise<{ hookData: Hex; deadline: bigint } | null> => {
    if (!walletClient || !address || !chainId || !addresses) {
      return null;
    }

    try {
      const nonce = await getNonce();
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);

      const domain = {
        ...EIP712_DOMAIN,
        chainId,
        verifyingContract: addresses.complianceHook as Address,
      };

      const signature = await walletClient.signTypedData({
        account: address,
        domain,
        types: LIQUIDITY_PERMIT_TYPES,
        primaryType: 'LiquidityPermit',
        message: {
          user: address,
          deadline,
          nonce,
        },
      });

      const hookData = encodeAbiParameters(
        [
          { type: 'address', name: 'user' },
          { type: 'uint256', name: 'deadline' },
          { type: 'uint256', name: 'nonce' },
          { type: 'bytes', name: 'signature' },
        ],
        [address, deadline, nonce, signature]
      );

      return { hookData, deadline };
    } catch (err) {
      console.error('Failed to sign permit:', err);
      return null;
    }
  }, [walletClient, address, chainId, addresses, getNonce]);

  /**
   * 获取池子列表
   */
  const fetchPools = useCallback(async () => {
    setLoading(true);
    try {
      // 从子图获取真实池子数据
      // 子图部署后，取消注释以下代码并更新 SUBGRAPH_URL
      
      /*
      const SUBGRAPH_URL = 'https://api.studio.thegraph.com/query/<DEPLOY_KEY>/ilal-base-sepolia/version/latest';
      
      const query = `
        query GetPools {
          liquidityPools(first: 10, orderBy: tvl, orderDirection: desc) {
            id
            token0 {
              address
              symbol
              decimals
              name
            }
            token1 {
              address
              symbol
              decimals
              name
            }
            fee
            tickSpacing
            sqrtPriceX96
            tick
            liquidity
            tvlUSD
            volumeUSD24h
            verified
          }
        }
      `;
      
      const response = await fetch(SUBGRAPH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      
      const { data } = await response.json();
      
      if (data?.liquidityPools) {
        const pools: Pool[] = data.liquidityPools.map((p: any) => ({
          id: p.id,
          token0: {
            address: p.token0.address,
            symbol: p.token0.symbol,
            decimals: p.token0.decimals,
            name: p.token0.name,
          },
          token1: {
            address: p.token1.address,
            symbol: p.token1.symbol,
            decimals: p.token1.decimals,
            name: p.token1.name,
          },
          fee: p.fee,
          tickSpacing: p.tickSpacing,
          sqrtPriceX96: BigInt(p.sqrtPriceX96),
          tick: p.tick,
          liquidity: BigInt(p.liquidity),
          tvl: `$${Number(p.tvlUSD).toLocaleString()}`,
          apr: calculateAPR(p.fee, p.volumeUSD24h, p.tvlUSD),
          volume24h: `$${Number(p.volumeUSD24h).toLocaleString()}`,
          verified: p.verified,
        }));
        
        setPools(pools);
        return;
      }
      */
      
      // 目前使用模拟数据（子图部署前）
      setPools(MOCK_POOLS);
    } catch (err) {
      console.error('Failed to fetch pools:', err);
      // 失败时使用模拟数据
      setPools(MOCK_POOLS);
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * 计算 APR（简化）
   */
  function calculateAPR(fee: number, volume24h: string, tvl: string): string {
    const dailyFees = (Number(volume24h) * fee) / 1000000;
    const apr = tvl !== '0' ? (dailyFees * 365 / Number(tvl)) * 100 : 0;
    return `${apr.toFixed(2)}%`;
  }

  /**
   * 获取用户持仓
   */
  const fetchPositions = useCallback(async () => {
    if (!publicClient || !address || !addresses) {
      return;
    }

    setLoading(true);
    try {
      const positionManagerAddress = addresses.positionManager as Address;
      
      // 获取用户持有的 NFT 数量
      const balance = await publicClient.readContract({
        address: positionManagerAddress,
        abi: POSITION_MANAGER_ABI,
        functionName: 'balanceOf',
        args: [address],
      });

      const userPositions: Position[] = [];

      // 遍历获取每个 position
      for (let i = 0n; i < balance; i++) {
        try {
          const tokenId = await publicClient.readContract({
            address: positionManagerAddress,
            abi: POSITION_MANAGER_ABI,
            functionName: 'tokenOfOwnerByIndex',
            args: [address, i],
          });

          const positionData = await publicClient.readContract({
            address: positionManagerAddress,
            abi: POSITION_MANAGER_ABI,
            functionName: 'positions',
            args: [tokenId],
          });

          // 计算实际代币金额（简化计算）
          // 实际应该使用 Uniswap v4 的 LiquidityAmounts 库计算
          const liquidity = BigInt(positionData[4]);
          const token0Amount = '~'; // 估算值，需要链上计算
          const token1Amount = '~'; // 估算值，需要链上计算
          
          userPositions.push({
            tokenId,
            poolId: `${positionData[1].currency0}-${positionData[1].currency1}-${positionData[1].fee}`,
            tickLower: positionData[2],
            tickUpper: positionData[3],
            liquidity,
            token0Amount,
            token1Amount,
            feesEarned0: '0', // 需要从 PositionManager 读取
            feesEarned1: '0', // 需要从 PositionManager 读取
          });
        } catch (err) {
          console.error(`Failed to fetch position ${i}:`, err);
        }
      }

      setPositions(userPositions);
    } catch (err) {
      console.error('Failed to fetch positions:', err);
    } finally {
      setLoading(false);
    }
  }, [publicClient, address, addresses]);

  /**
   * 添加流动性
   */
  const addLiquidity = useCallback(
    async (params: AddLiquidityParams): Promise<boolean> => {
      if (!address || !walletClient || !publicClient) {
        setError('Please connect your wallet');
        return false;
      }

      if (!isActive) {
        setError('Please complete identity verification first');
        return false;
      }

      if (!addresses) {
        setError('Unsupported network');
        return false;
      }

      setStatus('signing');
      setError(null);
      setTxHash(null);

      try {
        // 1. 生成 EIP-712 签名
        const signResult = await signLiquidityPermit();
        if (!signResult) {
          throw new Error('Signature failed or user cancelled');
        }

        const { hookData } = signResult;

        // 2. 找到池子信息
        const pool = pools.find(p => p.id === params.poolId);
        if (!pool) {
          throw new Error('Pool does not exist');
        }

        setStatus('adding');

        // 3. 计算流动性（简化计算）
        const amount0 = parseUnits(params.token0Amount, pool.token0.decimals);
        const amount1 = parseUnits(params.token1Amount, pool.token1.decimals);
        const liquidity = amount0 > amount1 ? amount0 : amount1; // 简化

        // 4. 构造 poolKey
        const poolKey = {
          currency0: pool.token0.address,
          currency1: pool.token1.address,
          fee: pool.fee,
          tickSpacing: pool.tickSpacing,
          hooks: addresses.complianceHook as Address,
        };

        // 5. 调用 mint
        const hash = await walletClient.writeContract({
          address: addresses.positionManager as Address,
          abi: POSITION_MANAGER_ABI,
          functionName: 'mint',
          args: [poolKey, params.tickLower, params.tickUpper, liquidity, hookData],
          value: pool.token0.symbol === 'ETH' ? amount0 : 0n,
        });

        setTxHash(hash);
        setStatus('confirming');

        // 6. 等待确认
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        if (receipt.status === 'success') {
          setStatus('success');
          // 刷新持仓
          await fetchPositions();
          return true;
        } else {
          throw new Error('Transaction failed');
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to add liquidity';
        
        if (msg.includes('User rejected') || msg.includes('denied')) {
          setError('User cancelled the operation');
        } else if (msg.includes('Signature failed') || msg.includes('签名失败')) {
          setError('Signature failed, please try again');
        } else {
          setError(msg);
        }
        
        setStatus('error');
        return false;
      }
    },
    [address, walletClient, publicClient, isActive, addresses, signLiquidityPermit, pools, fetchPositions]
  );

  /**
   * 移除流动性
   */
  const removeLiquidity = useCallback(
    async (params: RemoveLiquidityParams): Promise<boolean> => {
      if (!address || !walletClient || !publicClient) {
        setError('Please connect your wallet');
        return false;
      }

      if (!addresses) {
        setError('Unsupported network');
        return false;
      }

      setStatus('signing');
      setError(null);
      setTxHash(null);

      try {
        // 1. 生成签名
        const signResult = await signLiquidityPermit();
        if (!signResult) {
          throw new Error('Signature failed or user cancelled');
        }

        const { hookData } = signResult;

        // 2. 获取当前 position
        const position = positions.find(p => p.tokenId === params.tokenId);
        if (!position) {
          throw new Error('Position does not exist');
        }

        setStatus('removing');

        // 3. 计算要移除的流动性
        const liquidityToRemove = (position.liquidity * BigInt(params.liquidityPercent)) / 100n;

        // 4. 调用 decreaseLiquidity
        const hash = await walletClient.writeContract({
          address: addresses.positionManager as Address,
          abi: POSITION_MANAGER_ABI,
          functionName: 'decreaseLiquidity',
          args: [params.tokenId, liquidityToRemove, hookData],
        });

        setTxHash(hash);
        setStatus('confirming');

        // 5. 等待确认
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        if (receipt.status === 'success') {
          setStatus('success');
          await fetchPositions();
          return true;
        } else {
          throw new Error('Transaction failed');
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to remove liquidity';
        
        if (msg.includes('User rejected') || msg.includes('denied')) {
          setError('User cancelled the operation');
        } else {
          setError(msg);
        }
        
        setStatus('error');
        return false;
      }
    },
    [address, walletClient, publicClient, addresses, signLiquidityPermit, positions, fetchPositions]
  );

  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setTxHash(null);
  }, []);

  // 初始化加载
  useEffect(() => {
    fetchPools();
    if (address) {
      fetchPositions();
    }
  }, [fetchPools, fetchPositions, address]);

  return {
    // 状态
    status,
    error,
    txHash,
    loading,
    
    // 数据
    pools,
    positions,
    
    // 方法
    addLiquidity,
    removeLiquidity,
    fetchPools,
    fetchPositions,
    reset,
  };
}

// ============ 工具函数 ============

/**
 * 计算价格范围对应的 tick
 */
export function priceToTick(price: number, tickSpacing: number): number {
  const tick = Math.floor(Math.log(price) / Math.log(1.0001));
  return Math.round(tick / tickSpacing) * tickSpacing;
}

/**
 * 计算 tick 对应的价格
 */
export function tickToPrice(tick: number): number {
  return Math.pow(1.0001, tick);
}

/**
 * 格式化费率显示
 */
export function formatFee(fee: number): string {
  return `${(fee / 10000).toFixed(2)}%`;
}
