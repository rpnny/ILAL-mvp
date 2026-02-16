'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount, useWalletClient, usePublicClient, useChainId } from 'wagmi';
import { type Address, type Hex, encodeAbiParameters, formatUnits, parseUnits } from 'viem';
import { useSession } from './useSession';
import { getContractAddresses, complianceHookABI } from '@/lib/contracts';
import {
  POOL_MANAGER_ABI,
  UNISWAP_V4_ADDRESSES,
  createPoolKey,
  getPoolId,
  getPoolStateSlot,
  decodeSlot0,
  sqrtPriceX96ToPrice,
} from '@/lib/uniswap-v4';

const ERC20_ABI = [
  {
    type: 'function',
    name: 'allowance',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'approve',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

const MAX_UINT256 = (1n << 256n) - 1n;
const SESSION_MANAGER_ABI = [
  {
    type: 'function',
    name: 'isSessionActive',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
] as const;

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

export interface LiquidityBalanceDelta {
  token0: string;
  token1: string;
  token0Delta: string;
  token1Delta: string;
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
  SwapPermit: [
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
    inputs: [],
    name: 'nextTokenId',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'getPosition',
    outputs: [
      {
        components: [
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
          { name: 'liquidity', type: 'uint128' },
          { name: 'tickLower', type: 'int24' },
          { name: 'tickUpper', type: 'int24' },
          { name: 'createdAt', type: 'uint256' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
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
  const [lastLiquidityDelta, setLastLiquidityDelta] = useState<LiquidityBalanceDelta | null>(null);

  const addresses = chainId ? getContractAddresses(chainId) : null;

  const saveLocalHistoryRecord = useCallback(
    (record: {
      type: 'swap' | 'liquidity' | 'verify' | 'session';
      status: 'success' | 'pending' | 'failed';
      description: string;
      detail: string;
      txHash: string;
      blockNumber: string;
    }) => {
      if (!address || typeof window === 'undefined') return;
      const key = `ilal_history_${address}`;
      const stored = window.localStorage.getItem(key);
      const prev = stored ? JSON.parse(stored) : [];
      const timestamp = Math.floor(Date.now() / 1000);
      const newRecord = {
        ...record,
        id: `local-${Date.now()}`,
        time: 'Just now',
        timestamp,
      };
      const next = [newRecord, ...prev];
      window.localStorage.setItem(key, JSON.stringify(next));
    },
    [address]
  );

  const getTokenBalanceRaw = useCallback(
    async (token: Address, user: Address): Promise<bigint> => {
      if (!publicClient) throw new Error('publicClient not ready');
      if (token === ('0x0000000000000000000000000000000000000000' as Address)) {
        return publicClient.getBalance({ address: user });
      }
      const bal = await publicClient.readContract({
        address: token,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [user],
      });
      return bal;
    },
    [publicClient]
  );

  const checkOnchainSessionActive = useCallback(async (): Promise<boolean> => {
    if (!publicClient || !addresses || !address) return false;
    const onchainActive = await publicClient.readContract({
      address: addresses.sessionManager as Address,
      abi: SESSION_MANAGER_ABI,
      functionName: 'isSessionActive',
      args: [address],
    });
    return onchainActive;
  }, [publicClient, addresses, address]);

  /**
   * 获取用户当前 nonce
   */
  const getNonce = useCallback(async (): Promise<bigint> => {
    if (!publicClient || !addresses || !address) {
      throw new Error('Nonce dependencies missing');
    }

    const nonce = await publicClient.readContract({
      address: addresses.complianceHook as Address,
      abi: complianceHookABI,
      functionName: 'getNonce',
      args: [address],
    });
    return nonce as bigint;
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
        primaryType: 'SwapPermit',
        message: {
          user: address,
          deadline,
          nonce,
        },
      });

      // 编码为 struct tuple（与 ComplianceHook abi.decode((PermitData)) 匹配）
      const hookData = encodeAbiParameters(
        [
          {
            type: 'tuple',
            components: [
              { name: 'user', type: 'address' },
              { name: 'deadline', type: 'uint256' },
              { name: 'nonce', type: 'uint256' },
              { name: 'signature', type: 'bytes' },
            ],
          },
        ],
        [
          {
            user: address,
            deadline,
            nonce,
            signature,
          },
        ]
      );

      return { hookData, deadline };
    } catch (err) {
      console.error('Failed to sign permit:', err);
      return null;
    }
  }, [walletClient, address, chainId, addresses, getNonce]);

  /**
   * 获取池子列表（从链上读取真实数据）
   */
  const fetchPools = useCallback(async () => {
    setLoading(true);
    try {
      if (!publicClient || !addresses) {
        setPools(MOCK_POOLS);
        return;
      }

      const hookAddress = addresses.complianceHook as Address;

      // 已知的池子配置列表
      const poolConfigs = [
        { token0: TOKENS.USDC, token1: TOKENS.WETH, fee: 10000, tickSpacing: 200, label: 'Active Pool (1%)' },
        { token0: TOKENS.USDC, token1: TOKENS.WETH, fee: 500, tickSpacing: 10, label: 'Deprecated (0.05%)' },
        { token0: TOKENS.USDC, token1: TOKENS.WETH, fee: 3000, tickSpacing: 60, label: 'Deprecated (0.3%)' },
      ];

      const enrichedPools: Pool[] = [];

      for (let i = 0; i < poolConfigs.length; i++) {
        const config = poolConfigs[i];

        // 创建 PoolKey（自动排序 token 地址）
        const poolKey = createPoolKey(
          config.token0.address,
          config.token1.address,
          config.fee,
          config.tickSpacing,
          hookAddress
        );

        const poolId = getPoolId(poolKey);

        try {
          // 读取链上 Slot0 数据（通过 extsload）
          const stateSlot = getPoolStateSlot(poolId as `0x${string}`);
          const rawSlot0 = await publicClient.readContract({
            address: UNISWAP_V4_ADDRESSES.poolManager,
            abi: POOL_MANAGER_ABI,
            functionName: 'extsload',
            args: [stateSlot],
          });

          const slot0Data = decodeSlot0(rawSlot0 as `0x${string}`);
          const sqrtPriceX96 = slot0Data.sqrtPriceX96;
          const tick = slot0Data.tick;

          // 计算人类可读价格
          const price = sqrtPriceX96ToPrice(
            sqrtPriceX96,
            config.token0.decimals,
            config.token1.decimals
          );

          // 判断池子是否有效
          const isInitialized = sqrtPriceX96 > 0n;
          const isMaxTick = tick >= 887271;
          const isActive = isInitialized && !isMaxTick;

          // 估算 TVL
          const mockPool = MOCK_POOLS[i];
          const tvlEstimate = isActive
            ? (price > 0 ? `$${Math.round(price * 0.001 + 2).toLocaleString()}` : mockPool?.tvl || '$0')
            : '$0';

          enrichedPools.push({
            id: poolId,
            token0: { ...config.token0, address: poolKey.currency0 },
            token1: { ...config.token1, address: poolKey.currency1 },
            fee: config.fee,
            tickSpacing: config.tickSpacing,
            sqrtPriceX96,
            tick,
            liquidity: mockPool?.liquidity || 0n,
            tvl: tvlEstimate,
            apr: isActive ? (mockPool?.apr || '2.5%') : '0%',
            volume24h: isActive ? (mockPool?.volume24h || '$0') : '$0',
            verified: isActive,
          });

          console.log(`[Liquidity] Pool ${config.label}: tick=${tick}, price=${price.toFixed(6)}, active=${isActive}`);
        } catch (err) {
          console.error(`[Liquidity] Failed to query pool ${config.label}:`, err);
          if (MOCK_POOLS[i]) {
            enrichedPools.push(MOCK_POOLS[i]);
          }
        }
      }

      setPools(enrichedPools.length > 0 ? enrichedPools : MOCK_POOLS);
    } catch (err) {
      console.error('Failed to fetch pools:', err);
      setPools(MOCK_POOLS);
    } finally {
      setLoading(false);
    }
  }, [publicClient, addresses]);

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

      const userPositions: Position[] = [];
      const nextTokenId = await publicClient.readContract({
        address: positionManagerAddress,
        abi: POSITION_MANAGER_ABI,
        functionName: 'nextTokenId',
      });

      // 合约没有 ERC721 enumerable，遍历 tokenId 过滤 owner
      for (let tokenId = 1n; tokenId < nextTokenId; tokenId++) {
        try {
          const owner = await publicClient.readContract({
            address: positionManagerAddress,
            abi: POSITION_MANAGER_ABI,
            functionName: 'ownerOf',
            args: [tokenId],
          });

          if (owner.toLowerCase() !== address.toLowerCase()) continue;

          const positionData = await publicClient.readContract({
            address: positionManagerAddress,
            abi: POSITION_MANAGER_ABI,
            functionName: 'getPosition',
            args: [tokenId],
          });

          const liquidity = BigInt(positionData.liquidity);
          const token0Amount = '~'; // 估算值，需要链上计算
          const token1Amount = '~'; // 估算值，需要链上计算

          userPositions.push({
            tokenId,
            poolId: `${positionData.poolKey.currency0}-${positionData.poolKey.currency1}-${positionData.poolKey.fee}`,
            tickLower: positionData.tickLower,
            tickUpper: positionData.tickUpper,
            liquidity,
            token0Amount,
            token1Amount,
            feesEarned0: '0', // 需要从 PositionManager 读取
            feesEarned1: '0', // 需要从 PositionManager 读取
          });
        } catch (err) {
          console.error(`Failed to fetch position ${tokenId}:`, err);
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
      console.log('[Liquidity] Add liquidity started', params);
      
      if (!address || !walletClient || !publicClient) {
        console.error('[Liquidity] Missing wallet/client');
        setError('Please connect your wallet');
        return false;
      }

      if (!isActive) {
        console.error('[Liquidity] Session not active');
        setError('Please complete identity verification first');
        return false;
      }

      if (!addresses) {
        console.error('[Liquidity] Unsupported network');
        setError('Unsupported network');
        return false;
      }

      // 关键预检：PositionManager 以链上 SessionManager 为准。
      // 本地 useSession 可能有短暂缓存，若链上会话失效则 mint 必然回滚 NotVerified。
      const onchainSessionActive = await checkOnchainSessionActive();
      if (!onchainSessionActive) {
        setError('Session expired on-chain. Please re-verify to activate session, then retry add liquidity.');
        return false;
      }

      setStatus('signing');
      setError(null);
      setTxHash(null);
      setLastLiquidityDelta(null);

      try {
        // 1. 生成 EIP-712 签名
        console.log('[Liquidity] Step 1: Requesting EIP-712 signature...');
        const signResult = await signLiquidityPermit();
        if (!signResult) {
          throw new Error('Signature failed or user cancelled');
        }
        console.log('[Liquidity] Signature obtained');

        const { hookData } = signResult;

        // 2. 找到池子信息
        console.log('[Liquidity] Step 2: Finding pool...', params.poolId);
        const pool = pools.find(p => p.id === params.poolId);
        if (!pool) {
          throw new Error('Pool does not exist');
        }
        console.log('[Liquidity] Pool found:', pool.token0.symbol, '/', pool.token1.symbol);

        const before0 = await getTokenBalanceRaw(pool.token0.address, address);
        const before1 = await getTokenBalanceRaw(pool.token1.address, address);

        // 3. 计算流动性（简化计算）
        console.log('[Liquidity] Step 3: Calculating amounts...');
        const amount0 = parseUnits(params.token0Amount, pool.token0.decimals);
        const amount1 = parseUnits(params.token1Amount, pool.token1.decimals);

        // 估算 liquidity：按当前价格把 token1 折算成 token0，再取较小一侧，避免超额 mint 导致 gas 估算失败
        // 基于链上已存在仓位量级，采用保守系数（1 token0 ~= 2e5 liquidity）
        const token1PerToken0 = pool.sqrtPriceX96 > 0n
          ? sqrtPriceX96ToPrice(pool.sqrtPriceX96, pool.token0.decimals, pool.token1.decimals)
          : 0;
        const token1InToken0 = token1PerToken0 > 0 ? 1 / token1PerToken0 : 0;
        const amount0Human = Number(params.token0Amount);
        const amount1Human = Number(params.token1Amount);
        const amount1AsToken0 = token1InToken0 > 0 ? amount1Human * token1InToken0 : amount0Human;
        const effectiveToken0 = Math.min(amount0Human, amount1AsToken0);
        let liquidity = BigInt(Math.max(1, Math.floor(effectiveToken0 * 200_000))); // 2e5 per token0
        if (liquidity <= 0n) {
          throw new Error('Invalid liquidity amount');
        }
        // 防止一次提交过大导致估算失败
        if (liquidity > 2_000_000n) {
          liquidity = 2_000_000n;
        }
        console.log('[Liquidity] Amounts:', { 
          amount0: amount0.toString(), 
          amount1: amount1.toString(),
          liquidity: liquidity.toString(),
          token1PerToken0,
          effectiveToken0,
        });

        // 4. 构造 poolKey
        const poolKey = {
          currency0: pool.token0.address,
          currency1: pool.token1.address,
          fee: pool.fee,
          tickSpacing: pool.tickSpacing,
          hooks: addresses.complianceHook as Address,
        };
        console.log('[Liquidity] PoolKey:', poolKey);

        // 4.5 先授权 token0/token1 给 PositionManager（若不足）
        setStatus('approving');
        const spender = addresses.positionManager as Address;
        const approvalTargets: Array<{ token: Address; required: bigint; symbol: string }> = [];
        if (pool.token0.address !== ('0x0000000000000000000000000000000000000000' as Address)) {
          approvalTargets.push({ token: pool.token0.address, required: amount0, symbol: pool.token0.symbol });
        }
        if (pool.token1.address !== ('0x0000000000000000000000000000000000000000' as Address)) {
          approvalTargets.push({ token: pool.token1.address, required: amount1, symbol: pool.token1.symbol });
        }

        for (const target of approvalTargets) {
          const currentAllowance = await publicClient.readContract({
            address: target.token,
            abi: ERC20_ABI,
            functionName: 'allowance',
            args: [address, spender],
          });
          // 直接把授权提升到近无限，避免 mint 实际扣款与前端估算偏差导致 allowance 再次不足
          const safetyThreshold = MAX_UINT256 / 2n;
          console.log(`[Liquidity] ${target.symbol} allowance check`, {
            currentAllowance: currentAllowance.toString(),
            required: target.required.toString(),
            safetyThreshold: safetyThreshold.toString(),
          });
          if (currentAllowance < safetyThreshold) {
            console.log(`[Liquidity] Approving ${target.symbol} to PositionManager...`);
            const approveTx = await walletClient.writeContract({
              address: target.token,
              abi: ERC20_ABI,
              functionName: 'approve',
              args: [spender, MAX_UINT256],
            });
            await publicClient.waitForTransactionReceipt({ hash: approveTx });
            console.log(`[Liquidity] ${target.symbol} approved`);
          }
        }

        setStatus('adding');

        // 5. 调用 mint（先估算 gas，避免钱包侧泛化错误）
        console.log('[Liquidity] Step 4: Calling mint on PositionManager...');
        let estimatedGas: bigint;
        try {
          estimatedGas = await publicClient.estimateContractGas({
            address: addresses.positionManager as Address,
            abi: POSITION_MANAGER_ABI,
            functionName: 'mint',
            args: [poolKey, params.tickLower, params.tickUpper, liquidity, hookData],
            account: address,
            value: pool.token0.symbol === 'ETH' ? amount0 : 0n,
          });
          console.log('[Liquidity] Gas estimate:', estimatedGas.toString());
        } catch (gasErr: any) {
          console.error('[Liquidity] Gas estimation failed:', gasErr);
          throw gasErr;
        }

        const hash = await walletClient.writeContract({
          address: addresses.positionManager as Address,
          abi: POSITION_MANAGER_ABI,
          functionName: 'mint',
          args: [poolKey, params.tickLower, params.tickUpper, liquidity, hookData],
          value: pool.token0.symbol === 'ETH' ? amount0 : 0n,
          gas: estimatedGas + (estimatedGas / 10n),
        });
        console.log('[Liquidity] Transaction sent:', hash);

        setTxHash(hash);
        setStatus('confirming');

        // 6. 等待确认
        console.log('[Liquidity] Step 5: Waiting for confirmation...');
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        if (receipt.status === 'success') {
          console.log('[Liquidity] Success! Gas used:', receipt.gasUsed.toString());

          const after0 = await getTokenBalanceRaw(pool.token0.address, address);
          const after1 = await getTokenBalanceRaw(pool.token1.address, address);
          const delta0 = after0 - before0;
          const delta1 = after1 - before1;

          setLastLiquidityDelta({
            token0: pool.token0.symbol,
            token1: pool.token1.symbol,
            token0Delta: `${delta0 >= 0n ? '+' : ''}${formatUnits(delta0, pool.token0.decimals)}`,
            token1Delta: `${delta1 >= 0n ? '+' : ''}${formatUnits(delta1, pool.token1.decimals)}`,
          });

          setStatus('success');
          saveLocalHistoryRecord({
            type: 'liquidity',
            status: 'success',
            description: 'Add Liquidity',
            detail: `${pool.token0.symbol}/${pool.token1.symbol}`,
            txHash: hash,
            blockNumber: receipt.blockNumber.toString(),
          });
          // 刷新持仓 - 使用延迟避免立即重新渲染
          setTimeout(() => {
            fetchPositions();
          }, 1000);
          return true;
        } else {
          throw new Error('Transaction failed');
        }
      } catch (err) {
        console.error('[Liquidity] Error:', err);
        const msg = err instanceof Error ? err.message : 'Failed to add liquidity';

        if (msg.includes('User rejected') || msg.includes('denied') || msg.includes('cancelled')) {
          console.log('[Liquidity] User cancelled');
          setError('User cancelled the operation');
        } else if (msg.includes('0xb12c8f91') || msg.includes('NotVerified')) {
          setError('Not verified on-chain. Please complete verification again, then retry.');
        } else if (msg.includes('Signature failed') || msg.includes('签名失败')) {
          console.log('[Liquidity] Signature failed');
          setError('Signature failed, please try again');
        } else if (msg.includes('insufficient') || msg.includes('Insufficient')) {
          setError('Insufficient balance for this operation');
        } else {
          setError(msg);
        }

        setStatus('error');
        return false;
      }
    },
    [address, walletClient, publicClient, isActive, addresses, signLiquidityPermit, pools, fetchPositions, getTokenBalanceRaw, saveLocalHistoryRecord, checkOnchainSessionActive]
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
          saveLocalHistoryRecord({
            type: 'liquidity',
            status: 'success',
            description: 'Remove Liquidity',
            detail: `TokenId #${params.tokenId.toString()} (${params.liquidityPercent}%)`,
            txHash: hash,
            blockNumber: receipt.blockNumber.toString(),
          });
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
    [address, walletClient, publicClient, addresses, signLiquidityPermit, positions, fetchPositions, saveLocalHistoryRecord]
  );

  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setTxHash(null);
    setLastLiquidityDelta(null);
  }, []);

  // 初始化加载 - 修复无限循环问题
  // 分离两个 effect，使用直接依赖而不是 callback 依赖
  useEffect(() => {
    fetchPools();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicClient, addresses]);

  useEffect(() => {
    if (address) {
      fetchPositions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, publicClient, addresses]);

  return {
    // 状态
    status,
    error,
    txHash,
    loading,

    // 数据
    pools,
    positions,
    lastLiquidityDelta,

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
