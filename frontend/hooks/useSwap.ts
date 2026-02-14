'use client';

import { useState, useCallback } from 'react';
import { useAccount, useWalletClient, usePublicClient, useBalance } from 'wagmi';
import { parseEther, parseUnits, formatEther, formatUnits, encodeAbiParameters, type Address, type Hex } from 'viem';
import { useSession } from './useSession';
import { getContractAddresses, complianceHookABI, simpleSwapRouterABI } from '@/lib/contracts';
import { usePoolPrice as usePoolPriceHook, useCalculateSwapOutput } from './usePoolPrice';
import { POOL_MANAGER_ABI, UNISWAP_V4_ADDRESSES, getPoolId, getPoolStateSlot, decodeSlot0 } from '@/lib/uniswap-v4';

// ============ 类型 ============

export interface SwapParams {
  fromToken: string;
  toToken: string;
  amount: string;
  slippage: number; // bps (50 = 0.5%)
}

export interface SwapQuote {
  expectedOutput: string;
  priceImpact: string;
  estimatedGas: string;
  route: string;
}

export interface SwapBalanceDelta {
  fromToken: string;
  toToken: string;
  fromDelta: string;
  toDelta: string;
}

export type SwapStatus = 'idle' | 'quoting' | 'signing' | 'approving' | 'swapping' | 'confirming' | 'success' | 'error';

// ============ Token 定义 ============

export const TOKENS: Record<string, { address: Address | 'native'; symbol: string; decimals: number; name: string; logo: string }> = {
  ETH: {
    address: 'native',
    symbol: 'ETH',
    decimals: 18,
    name: 'Ether',
    logo: '/tokens/eth.svg',
  },
  USDC: {
    address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address, // Base Sepolia USDC
    symbol: 'USDC',
    decimals: 6,
    name: 'USD Coin',
    logo: '/tokens/usdc.svg',
  },
  WETH: {
    address: '0x4200000000000000000000000000000000000006' as Address, // Base WETH
    symbol: 'WETH',
    decimals: 18,
    name: 'Wrapped Ether',
    logo: '/tokens/weth.svg',
  },
};

// Pool 配置 — 活跃 Pool (fee=10000, tickSpacing=200)
const POOL_CONFIG = {
  currency0: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address, // USDC (排序后 currency0)
  currency1: '0x4200000000000000000000000000000000000006' as Address, // WETH (排序后 currency1)
  fee: 10000,
  tickSpacing: 200,
};

// 简易报价（备用价格）
const MOCK_PRICES: Record<string, number> = {
  'ETH/USDC': 2500,
  'USDC/ETH': 1 / 2500,
  'ETH/WETH': 1,
  'WETH/ETH': 1,
  'WETH/USDC': 2500,
  'USDC/WETH': 1 / 2500,
};

// Uniswap v4 sqrtPriceX96 limits
const MIN_SQRT_PRICE_LIMIT = BigInt('4295128739') + 1n; // TickMath.MIN_SQRT_PRICE + 1
const MAX_SQRT_PRICE_LIMIT = BigInt('1461446703485210103287273052203988822378723970342') - 1n; // TickMath.MAX_SQRT_PRICE - 1

// USDC ERC20 ABI (for approve)
const ERC20_ABI = [
  {
    type: 'function',
    name: 'approve',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'allowance',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

const WETH_ABI = [
  {
    type: 'function',
    name: 'deposit',
    inputs: [],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'withdraw',
    inputs: [{ name: 'wad', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

const SESSION_MANAGER_ABI = [
  {
    type: 'function',
    name: 'isSessionActive',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
] as const;

// ============ EIP-712 类型 ============

const EIP712_DOMAIN = {
  name: 'ILAL ComplianceHook',
  version: '1',
} as const;

const SWAP_PERMIT_TYPES = {
  SwapPermit: [
    { name: 'user', type: 'address' },
    { name: 'deadline', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
  ],
} as const;

// ============ Hook ============

export function useSwap() {
  const { address, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { isActive } = useSession();

  // 获取真实价格数据
  const calculateSwapOutput = useCalculateSwapOutput();
  const ethUsdcPrice = usePoolPriceHook({
    token0: TOKENS.USDC.address as Address, // currency0 = USDC (sorted)
    token1: TOKENS.WETH.address as Address, // currency1 = WETH (sorted)
    token0Decimals: TOKENS.USDC.decimals,
    token1Decimals: TOKENS.WETH.decimals,
    fee: 10000,
  });

  const [status, setStatus] = useState<SwapStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [lastSwapDelta, setLastSwapDelta] = useState<SwapBalanceDelta | null>(null);

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
    async (token: string, user: Address): Promise<bigint> => {
      if (!publicClient) throw new Error('publicClient not ready');
      if (token === 'ETH') {
        return publicClient.getBalance({ address: user });
      }

      const tokenAddress =
        token === 'USDC'
          ? (TOKENS.USDC.address as Address)
          : (TOKENS.WETH.address as Address);

      const bal = await publicClient.readContract({
        address: tokenAddress,
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
  const signSwapPermit = useCallback(async (): Promise<{ hookData: Hex; deadline: bigint } | null> => {
    if (!walletClient || !address || !chainId || !addresses) {
      console.error('[signSwapPermit] Missing dependencies:', {
        hasWalletClient: !!walletClient,
        hasAddress: !!address,
        hasChainId: !!chainId,
        hasAddresses: !!addresses,
      });
      return null;
    }

    try {
      console.log('[signSwapPermit] Fetching nonce...');
      const nonce = await getNonce();
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);

      const domain = {
        ...EIP712_DOMAIN,
        chainId,
        verifyingContract: addresses.complianceHook as Address,
      };

      console.log('[signSwapPermit] Requesting wallet signature...', { 
        nonce: nonce.toString(), 
        deadline: deadline.toString(),
        domain,
        address,
        chainId 
      });
      
      const signature = await walletClient.signTypedData({
        account: address,
        domain,
        types: SWAP_PERMIT_TYPES,
        primaryType: 'SwapPermit',
        message: {
          user: address,
          deadline,
          nonce,
        },
      });

      console.log('[signSwapPermit] Signature received:', signature.slice(0, 20) + '...');

      // 编码为 struct tuple (Solidity abi.decode 期望的格式)
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
      console.error('[signSwapPermit] Failed to sign:', err);
      
      // 详细的错误信息
      if (err instanceof Error) {
        console.error('[signSwapPermit] Error details:', {
          message: err.message,
          name: err.name,
          stack: err.stack?.slice(0, 200),
        });
        
        if (err.message.includes('rejected') || err.message.includes('denied') || err.message.includes('User rejected')) {
          console.log('[signSwapPermit] User rejected signature');
        } else if (err.message.includes('Invalid chainId') || err.message.includes('chain')) {
          console.error('[signSwapPermit] Chain mismatch! Expected:', chainId);
        } else if (err.message.includes('accounts')) {
          console.error('[signSwapPermit] Account issue');
        }
      }
      return null;
    }
  }, [walletClient, address, chainId, addresses, getNonce]);

  /**
   * 获取交易报价
   */
  const getQuote = useCallback(
    async (params: SwapParams): Promise<SwapQuote | null> => {
      if (!params.amount || parseFloat(params.amount) <= 0) {
        setQuote(null);
        return null;
      }

      setStatus('quoting');
      setError(null);

      try {
        let priceData = ethUsdcPrice;
        let fromToken: 'token0' | 'token1' = 'token0';
        let isSupported = false;

        if ((params.fromToken === 'ETH' || params.fromToken === 'WETH') && params.toToken === 'USDC') {
          priceData = ethUsdcPrice;
          fromToken = 'token1'; // WETH is currency1, selling token1 for token0
          isSupported = true;
        } else if (params.fromToken === 'USDC' && (params.toToken === 'ETH' || params.toToken === 'WETH')) {
          priceData = ethUsdcPrice;
          fromToken = 'token0'; // USDC is currency0, selling token0 for token1
          isSupported = true;
        }

        if (isSupported && !priceData.loading && priceData.price > 0 && !priceData.error) {
          const { output, priceImpact } = calculateSwapOutput(
            params.amount,
            priceData,
            fromToken,
            100 // 1% fee
          );

          const newQuote: SwapQuote = {
            expectedOutput: output,
            priceImpact,
            estimatedGas: '~0.0005 ETH',
            route: `${params.fromToken} → ComplianceHook → SimpleSwapRouter → ${params.toToken}`,
          };

          setQuote(newQuote);
          setStatus('idle');
          return newQuote;
        }

        // Fallback: Mock 价格
        const pricePair = `${params.fromToken}/${params.toToken}`;
        const fallbackPrice = MOCK_PRICES[pricePair];

        if (!fallbackPrice) {
          throw new Error(`Unsupported trading pair: ${pricePair}`);
        }

        const inputAmount = parseFloat(params.amount);
        const outputAmount = inputAmount * fallbackPrice;

        const newQuote: SwapQuote = {
          expectedOutput: outputAmount.toFixed(params.toToken === 'USDC' ? 2 : 6),
          priceImpact: inputAmount > 10 ? '0.15' : '0.05',
          estimatedGas: '~0.0005 ETH',
          route: `${params.fromToken} → fallback price → ${params.toToken}`,
        };

        setQuote(newQuote);
        setStatus('idle');
        return newQuote;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to get quote';
        setError(msg);
        setStatus('error');
        return null;
      }
    },
    [ethUsdcPrice, calculateSwapOutput]
  );

  /**
   * 执行交易 — 通过 SimpleSwapRouter 调用
   */
  const executeSwap = useCallback(
    async (params: SwapParams): Promise<boolean> => {
      console.log('[Swap] executeSwap called with:', params);
      console.log('[Swap] Pre-flight checks:', {
        address: !!address,
        publicClient: !!publicClient,
        walletClient: !!walletClient,
        isActive,
        addresses: !!addresses,
      });

      // 先检查基础条件，避免触发不必要的钱包连接
      if (!address) {
        console.error('[Swap] ❌ Check failed: address not found');
        setError('Please connect your wallet');
        return false;
      }

      if (!publicClient) {
        console.error('[Swap] ❌ Check failed: publicClient not ready');
        setError('Network not ready');
        return false;
      }

      if (!walletClient) {
        console.error('[Swap] ❌ Check failed: walletClient not ready');
        setError('Wallet client not ready, please reconnect');
        return false;
      }

      if (!isActive) {
        console.error('[Swap] ❌ Check failed: session not active');
        setError('Please complete identity verification first');
        return false;
      }

      if (!addresses) {
        console.error('[Swap] ❌ Check failed: addresses not found');
        setError('Unsupported network');
        return false;
      }

      // 关键预检：合约侧只认链上 Session，Mock 本地会话不能通过 Hook 校验
      const onchainSessionActive = await checkOnchainSessionActive();
      if (!onchainSessionActive) {
        setError('On-chain session is not active. Please complete real verification (Coinbase + relay) before swap.');
        return false;
      }

      console.log('[Swap] ✅ All pre-flight checks passed');
      setStatus('signing');
      setError(null);
      setTxHash(null);
      setLastSwapDelta(null);

      try {
        const beforeWeth = await getTokenBalanceRaw('WETH', address);
        const beforeFrom = await getTokenBalanceRaw(params.fromToken, address);
        const beforeTo = await getTokenBalanceRaw(params.toToken, address);

        // 1. 生成 EIP-712 签名
        console.log('[Swap] Step 1: Requesting EIP-712 signature...');
        console.log('[Swap] Current state:', {
          address,
          chainId,
          expectedChainId: 84532, // Base Sepolia
          hasAddresses: !!addresses,
          contracts: addresses,
        });
        
        // 检查网络
        if (chainId !== 84532) {
          throw new Error(`Wrong network! Please switch to Base Sepolia (Chain ID: 84532). Current: ${chainId}`);
        }
        
        const signResult = await signSwapPermit();

        if (!signResult) {
          throw new Error('Signature cancelled by user');
        }
        
        console.log('[Swap] Signature obtained successfully');

        const { hookData } = signResult;

        // 2. 确定交易方向
        // currency0 = USDC (0x036C...), currency1 = WETH (0x4200...)
        // zeroForOne = true means: sell currency0 (USDC) to buy currency1 (WETH)
        // zeroForOne = false means: sell currency1 (WETH) to buy currency0 (USDC)
        const isSellingUSDC = params.fromToken === 'USDC';
        const zeroForOne = isSellingUSDC; // USDC → WETH = zeroForOne

        // 3. 计算 amountSpecified
        // Uniswap v4 约定：负数 = exact input，正数 = exact output
        const fromTokenInfo = TOKENS[params.fromToken];
        const rawAmount = parseUnits(params.amount, fromTokenInfo.decimals);
        // exact input: 用户指定卖出金额 → amountSpecified 为负数
        const amountSpecified = -rawAmount;

        // 4. 如果卖出 ERC20 (USDC)，先 approve 给 SimpleSwapRouter
        //    注意：SimpleSwapRouter 内部调用 transferFrom(user, poolManager, amount)
        //    所以用户需要授权 SimpleSwapRouter（不是 PoolManager）
        const routerAddress = addresses.simpleSwapRouter as Address;

        if (isSellingUSDC) {
          setStatus('approving');
          console.log('[Swap] Step 2: Approving USDC to SimpleSwapRouter...');

          const usdcAddress = TOKENS.USDC.address as Address;

          // 检查 allowance (对 SimpleSwapRouter)
          const currentAllowance = await publicClient.readContract({
            address: usdcAddress,
            abi: ERC20_ABI,
            functionName: 'allowance',
            args: [address, routerAddress],
          });

          if (currentAllowance < rawAmount) {
            const approveTx = await walletClient.writeContract({
              address: usdcAddress,
              abi: ERC20_ABI,
              functionName: 'approve',
              args: [routerAddress, rawAmount * 10n], // approve 10x for future swaps
            });
            await publicClient.waitForTransactionReceipt({ hash: approveTx });
            console.log('[Swap] USDC approved to SimpleSwapRouter');
          }
        } else {
          // 卖出 WETH：需要先 approve WETH 给 SimpleSwapRouter
          setStatus('approving');
          console.log('[Swap] Step 2: Approving WETH to SimpleSwapRouter...');

          const wethAddress = TOKENS.WETH.address as Address;

          // UX 上用户选的是 ETH，但池子输入实际是 WETH。
          // 若 WETH 余额不足，则先自动 wrap 原生 ETH。
          if (params.fromToken === 'ETH') {
            const wethBalance = await publicClient.readContract({
              address: wethAddress,
              abi: ERC20_ABI,
              functionName: 'balanceOf',
              args: [address],
            });

            if (wethBalance < rawAmount) {
              const wrapAmount = rawAmount - wethBalance;
              console.log('[Swap] Wrapping ETH to WETH:', wrapAmount.toString());
              const wrapTx = await walletClient.writeContract({
                address: wethAddress,
                abi: WETH_ABI,
                functionName: 'deposit',
                args: [],
                value: wrapAmount,
              });
              await publicClient.waitForTransactionReceipt({ hash: wrapTx });
              console.log('[Swap] ETH wrapped to WETH');
            }
          }

          const currentAllowance = await publicClient.readContract({
            address: wethAddress,
            abi: ERC20_ABI,
            functionName: 'allowance',
            args: [address, routerAddress],
          });

          if (currentAllowance < rawAmount) {
            const approveTx = await walletClient.writeContract({
              address: wethAddress,
              abi: ERC20_ABI,
              functionName: 'approve',
              args: [routerAddress, rawAmount * 10n],
            });
            await publicClient.waitForTransactionReceipt({ hash: approveTx });
            console.log('[Swap] WETH approved to SimpleSwapRouter');
          }
        }

        setStatus('swapping');
        console.log('[Swap] Step 3: Executing swap via SimpleSwapRouter...');

        // 5. 构造 PoolKey
        const poolKey = {
          currency0: POOL_CONFIG.currency0,
          currency1: POOL_CONFIG.currency1,
          fee: POOL_CONFIG.fee,
          tickSpacing: POOL_CONFIG.tickSpacing,
          hooks: addresses.complianceHook as Address,
        };

        // 6. 构造 SwapParams
        // 每次交易前实时读取链上 slot0，避免价格缓存滞后导致 PriceLimitAlreadyExceeded
        const currentPoolId = getPoolId({
          currency0: POOL_CONFIG.currency0,
          currency1: POOL_CONFIG.currency1,
          fee: POOL_CONFIG.fee,
          tickSpacing: POOL_CONFIG.tickSpacing,
          hooks: addresses.complianceHook as Address,
        });
        const currentStateSlot = getPoolStateSlot(currentPoolId);
        const currentRawSlot0 = await publicClient.readContract({
          address: UNISWAP_V4_ADDRESSES.poolManager,
          abi: POOL_MANAGER_ABI,
          functionName: 'extsload',
          args: [currentStateSlot],
        });
        const currentSlot0 = decodeSlot0(currentRawSlot0 as `0x${string}`);
        const currentSqrtPriceX96 = currentSlot0.sqrtPriceX96;

        console.log('[Swap] Live slot0 before swap:', {
          sqrtPriceX96: currentSqrtPriceX96.toString(),
          tick: currentSlot0.tick,
        });
        if (!currentSqrtPriceX96 || currentSqrtPriceX96 === 0n) {
          throw new Error('Pool price unavailable, please wait for refresh and retry');
        }

        const slippageBps = BigInt(params.slippage || 50); // 默认 0.5%
        const bpsBase = 10_000n;
        let sqrtPriceLimitX96: bigint;
        if (zeroForOne) {
          // token0 -> token1：价格向下，limit 必须 < current 且 > MIN
          if (currentSqrtPriceX96 <= MIN_SQRT_PRICE_LIMIT) {
            setError('Pool is at lower price bound. USDC -> ETH temporarily unavailable.');
            return false;
          }
          // 按滑点下移 limit，避免 current-1 导致可成交量接近 0
          sqrtPriceLimitX96 = (currentSqrtPriceX96 * (bpsBase - slippageBps)) / bpsBase;
          if (sqrtPriceLimitX96 <= MIN_SQRT_PRICE_LIMIT) {
            sqrtPriceLimitX96 = MIN_SQRT_PRICE_LIMIT + 1n;
          }
          if (sqrtPriceLimitX96 >= currentSqrtPriceX96) {
            sqrtPriceLimitX96 = currentSqrtPriceX96 - 1n;
          }
        } else {
          // token1 -> token0：价格向上，limit 必须 > current 且 < MAX
          if (currentSqrtPriceX96 >= MAX_SQRT_PRICE_LIMIT) {
            setError('Pool is at upper price bound. ETH -> USDC temporarily unavailable. Try a small USDC -> ETH swap first.');
            return false;
          }
          // 按滑点上移 limit，避免 current+1 导致可成交量接近 0
          sqrtPriceLimitX96 = (currentSqrtPriceX96 * (bpsBase + slippageBps)) / bpsBase;
          if (sqrtPriceLimitX96 >= MAX_SQRT_PRICE_LIMIT) {
            sqrtPriceLimitX96 = MAX_SQRT_PRICE_LIMIT - 1n;
          }
          if (sqrtPriceLimitX96 <= currentSqrtPriceX96) {
            sqrtPriceLimitX96 = currentSqrtPriceX96 + 1n;
          }
        }

        const swapParams = {
          zeroForOne,
          amountSpecified, // 负数 = exact input
          sqrtPriceLimitX96,
        };

        // 7. 调用 SimpleSwapRouter.swap()
        // 注意：Pool 使用 WETH（ERC20），不使用原生 ETH，所以 value = 0
        const value = 0n;

        console.log('[Swap] Transaction details:', {
          router: addresses.simpleSwapRouter,
          poolKey,
          swapParams: {
            zeroForOne,
            amountSpecified: amountSpecified.toString(),
            sqrtPriceLimitX96: swapParams.sqrtPriceLimitX96.toString(),
          },
          value: value.toString(),
          hookDataLength: hookData.length,
        });

        // 尝试估算 Gas
        let estimatedGas: bigint;
        try {
          estimatedGas = await publicClient.estimateContractGas({
            address: addresses.simpleSwapRouter as Address,
            abi: simpleSwapRouterABI,
            functionName: 'swap',
            args: [poolKey, swapParams, hookData],
            account: address,
            value,
          });
          console.log('[Swap] Gas estimate:', estimatedGas.toString());
        } catch (gasError: any) {
          console.error('[Swap] Gas estimation failed:', gasError);
          const gasSig = typeof gasError?.message === 'string' ? gasError.message.match(/0x[0-9a-fA-F]{8}/)?.[0] : null;
          if (gasSig) {
            console.error('[Swap] Gas estimation revert signature:', gasSig);
          }
          
          // 尝试模拟调用以获取更详细的错误
          try {
            await publicClient.simulateContract({
              address: addresses.simpleSwapRouter as Address,
              abi: simpleSwapRouterABI,
              functionName: 'swap',
              args: [poolKey, swapParams, hookData],
              account: address,
              value,
            });
          } catch (simError: any) {
            console.error('[Swap] Simulation failed:', simError);
            const simSig = typeof simError?.message === 'string' ? simError.message.match(/0x[0-9a-fA-F]{8}/)?.[0] : null;
            if (simSig) {
              console.error('[Swap] Simulation revert signature:', simSig);
            }
            throw new Error(`Swap simulation failed: ${simError.message || simError.shortMessage || 'Unknown error'}`);
          }
          
          throw gasError;
        }

        const hash = await walletClient.writeContract({
          address: addresses.simpleSwapRouter as Address,
          abi: simpleSwapRouterABI,
          functionName: 'swap',
          args: [poolKey, swapParams, hookData],
          value,
          gas: estimatedGas + (estimatedGas / 10n), // 添加 10% buffer
        });

        setTxHash(hash);
        setStatus('confirming');
        console.log('[Swap] TX sent:', hash);

        // 8. 等待确认
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        if (receipt.status === 'success') {
          // 若用户目标是 ETH，链上实际先收到 WETH，这里自动 unwrap 为 ETH
          if (params.toToken === 'ETH') {
            const afterWethBeforeUnwrap = await getTokenBalanceRaw('WETH', address);
            const receivedWeth = afterWethBeforeUnwrap - beforeWeth;
            if (receivedWeth > 0n) {
              console.log('[Swap] Auto-unwrapping WETH to ETH:', receivedWeth.toString());
              const unwrapHash = await walletClient.writeContract({
                address: TOKENS.WETH.address as Address,
                abi: WETH_ABI,
                functionName: 'withdraw',
                args: [receivedWeth],
              });
              await publicClient.waitForTransactionReceipt({ hash: unwrapHash });
              console.log('[Swap] WETH unwrapped to ETH');
            }
          }

          const afterFrom = await getTokenBalanceRaw(params.fromToken, address);
          const afterTo = await getTokenBalanceRaw(params.toToken, address);
          const fromDecimals = TOKENS[params.fromToken].decimals;
          const toDecimals = TOKENS[params.toToken].decimals;
          const fromDelta = afterFrom - beforeFrom;
          const toDelta = afterTo - beforeTo;

          setLastSwapDelta({
            fromToken: params.fromToken,
            toToken: params.toToken,
            fromDelta: `${fromDelta >= 0n ? '+' : ''}${formatUnits(fromDelta, fromDecimals)}`,
            toDelta: `${toDelta >= 0n ? '+' : ''}${formatUnits(toDelta, toDecimals)}`,
          });

          console.log('[Swap] Balance delta:', {
            fromToken: params.fromToken,
            toToken: params.toToken,
            fromDelta: `${fromDelta >= 0n ? '+' : ''}${formatUnits(fromDelta, fromDecimals)}`,
            toDelta: `${toDelta >= 0n ? '+' : ''}${formatUnits(toDelta, toDecimals)}`,
          });

          setStatus('success');
          console.log('[Swap] Success! Gas used:', receipt.gasUsed.toString());

          saveLocalHistoryRecord({
            type: 'swap',
            status: 'success',
            description: 'Swap Transaction',
            detail: `${params.fromToken} -> ${params.toToken}`,
            txHash: hash,
            blockNumber: receipt.blockNumber.toString(),
          });
          return true;
        } else {
          throw new Error('Transaction reverted');
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Transaction failed';

        if (msg.includes('User rejected') || msg.includes('denied') || msg.includes('cancelled')) {
          setError('User cancelled the operation');
        } else if (msg.includes('Session') || msg.includes('not active')) {
          setError('Session not active, please complete identity verification first');
        } else if (msg.includes('Signature failed')) {
          setError('Signature failed, please try again');
        } else if (msg.includes('insufficient') || msg.includes('Insufficient')) {
          setError('Insufficient balance for this swap');
        } else if (msg.includes('0x90bfb865') || msg.includes('0xb12c8f91') || msg.includes('NotVerified')) {
          setError('Swap blocked by ComplianceHook: account not verified on-chain.');
        } else {
          setError(msg);
        }

        setStatus('error');
        return false;
      }
    },
    [address, walletClient, publicClient, isActive, addresses, signSwapPermit, getTokenBalanceRaw, saveLocalHistoryRecord, checkOnchainSessionActive]
  );

  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setTxHash(null);
    setQuote(null);
    setLastSwapDelta(null);
  }, []);

  /**
   * 获取代币价格
   */
  const getTokenPrice = useCallback((from: string, to: string): number | null => {
    // 链上价格: price = WETH per USDC (token1/token0), invertedPrice = USDC per WETH
    // getPrice(from, to) 应该返回 "1 from = ? to"
    if (!ethUsdcPrice.loading && ethUsdcPrice.price > 0 && !ethUsdcPrice.error) {
      if ((from === 'ETH' || from === 'WETH') && to === 'USDC') {
        // 1 ETH = ? USDC → 返回 invertedPrice (USDC per WETH)
        return ethUsdcPrice.invertedPrice;
      }
      if (from === 'USDC' && (to === 'ETH' || to === 'WETH')) {
        // 1 USDC = ? ETH → 返回 price (WETH per USDC)
        return ethUsdcPrice.price;
      }
    }
    return MOCK_PRICES[`${from}/${to}`] || null;
  }, [ethUsdcPrice]);

  return {
    status,
    error,
    txHash,
    quote,
    getQuote,
    executeSwap,
    reset,
    getPrice: getTokenPrice,
    priceLoading: ethUsdcPrice.loading,
    lastSwapDelta,
  };
}
