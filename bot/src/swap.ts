import { 
  type Address,
  type Hex,
  parseUnits,
  formatUnits,
  encodeAbiParameters,
  parseAbiParameters,
  keccak256,
  toHex,
} from 'viem';
import { 
  publicClient, 
  walletClient, 
  botAddress, 
  contracts,
} from './contracts.js';
import { config, type PoolConfig } from './config.js';
import { log } from './logger.js';
import { signSwapPermit } from './eip712.js';
import { ensureActiveSession } from './session.js';

// ============ SimpleSwapRouter ABI ============

const SIMPLE_SWAP_ROUTER_ABI = [
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
        name: 'key',
        type: 'tuple',
      },
      {
        components: [
          { name: 'zeroForOne', type: 'bool' },
          { name: 'amountSpecified', type: 'int256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
        name: 'params',
        type: 'tuple',
      },
      { name: 'hookData', type: 'bytes' },
    ],
    name: 'swap',
    outputs: [{ name: 'delta', type: 'int256' }],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;

// ============ PoolManager ABI (获取 tick) ============

const POOL_MANAGER_ABI = [
  {
    inputs: [{ name: 'id', type: 'bytes32' }],
    name: 'getSlot0',
    outputs: [
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'tick', type: 'int24' },
      { name: 'protocolFee', type: 'uint24' },
      { name: 'lpFee', type: 'uint24' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// ============ ERC20 ABI ============

const ERC20_ABI = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// ============ 类型 ============

export interface SwapParams {
  pool: PoolConfig;
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  minAmountOut: bigint;
}

export interface SwapResult {
  success: boolean;
  txHash?: string;
  amountOut?: bigint;
  error?: string;
}

// ============ 辅助函数 ============

/**
 * 计算 Pool ID (keccak256(abi.encode(PoolKey)))
 */
function getPoolId(pool: PoolConfig): Hex {
  const encoded = encodeAbiParameters(
    parseAbiParameters('address, address, uint24, int24, address'),
    [
      pool.token0,
      pool.token1,
      pool.fee,
      pool.tickSpacing,
      contracts.complianceHook,
    ]
  );
  return keccak256(encoded);
}

/**
 * 获取池子的当前 tick（从链上 PoolManager 读取）
 */
export async function getCurrentTick(pool: PoolConfig): Promise<number> {
  try {
    const poolId = getPoolId(pool);

    const slot0 = await publicClient.readContract({
      address: contracts.poolManager,
      abi: POOL_MANAGER_ABI,
      functionName: 'getSlot0',
      args: [poolId],
    });

    const tick = Number(slot0[1]);
    const sqrtPriceX96 = slot0[0];

    log.debug('获取到链上 tick', { 
      poolId: pool.id,
      tick,
      sqrtPriceX96: sqrtPriceX96.toString(),
    });

    return tick;
  } catch (error) {
    log.warn('获取链上 tick 失败，返回默认值', { 
      poolId: pool.id,
      error: String(error),
    });
    return 0;
  }
}

/**
 * 获取池子价格（sqrtPriceX96 → 人类可读价格）
 */
export async function getPoolPrice(pool: PoolConfig): Promise<{
  price: number;
  tick: number;
  sqrtPriceX96: bigint;
}> {
  try {
    const poolId = getPoolId(pool);

    const slot0 = await publicClient.readContract({
      address: contracts.poolManager,
      abi: POOL_MANAGER_ABI,
      functionName: 'getSlot0',
      args: [poolId],
    });

    const sqrtPriceX96 = slot0[0];
    const tick = Number(slot0[1]);

    // sqrtPriceX96 → price
    // price = (sqrtPriceX96 / 2^96)^2 * 10^(token0Decimals - token1Decimals)
    const Q96 = 2n ** 96n;
    const priceRaw = Number(sqrtPriceX96) / Number(Q96);
    const price = priceRaw * priceRaw;

    return { price, tick, sqrtPriceX96 };
  } catch (error) {
    log.error('获取池子价格失败', { poolId: pool.id, error: String(error) });
    return { price: 0, tick: 0, sqrtPriceX96: 0n };
  }
}

// ============ Token Approve ============

/**
 * 确保代币授权
 */
async function ensureTokenApproval(
  token: Address,
  spender: Address,
  amount: bigint
): Promise<void> {
  const allowance = await publicClient.readContract({
    address: token,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [botAddress, spender],
  });

  if (allowance < amount) {
    log.info('授权代币...', {
      token,
      spender,
      amount: amount.toString(),
    });

    const hash = await walletClient.writeContract({
      address: token,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spender, amount * 2n], // 多授权一些避免频繁授权
    });

    await publicClient.waitForTransactionReceipt({ hash });
    log.info('代币授权成功', { token, hash });
  }
}

// ============ Swap 执行 ============

/**
 * 执行 Swap 交易（通过 SimpleSwapRouter）
 */
export async function executeSwap(params: SwapParams): Promise<SwapResult> {
  try {
    // 1. 确保 Session 有效
    await ensureActiveSession();

    // 2. 生成 EIP-712 签名
    log.info('生成 Swap 签名...', {
      pool: params.pool.id,
      tokenIn: params.tokenIn,
      amountIn: formatUnits(params.amountIn, 18),
    });

    const { hookData } = await signSwapPermit();

    // 3. 确保代币授权给 SimpleSwapRouter
    const routerAddress = contracts.simpleSwapRouter;
    if (!routerAddress) {
      throw new Error('SimpleSwapRouter 地址未配置');
    }

    await ensureTokenApproval(params.tokenIn, routerAddress, params.amountIn);

    // 4. 判断交换方向
    const zeroForOne = params.tokenIn.toLowerCase() === params.pool.token0.toLowerCase();

    // 5. 构造 swap 参数
    const poolKey = {
      currency0: params.pool.token0,
      currency1: params.pool.token1,
      fee: params.pool.fee,
      tickSpacing: params.pool.tickSpacing,
      hooks: contracts.complianceHook,
    };

    // sqrtPriceLimitX96: 设置滑点保护
    // zeroForOne: MIN_SQRT_PRICE + 1
    // oneForZero: MAX_SQRT_PRICE - 1
    const MIN_SQRT_PRICE = 4295128739n;
    const MAX_SQRT_PRICE = 1461446703485210103287273052203988822378723970342n;

    const swapParams = {
      zeroForOne,
      amountSpecified: params.amountIn, // 正数 = exact input
      sqrtPriceLimitX96: zeroForOne ? MIN_SQRT_PRICE + 1n : MAX_SQRT_PRICE - 1n,
    };

    log.info('执行 Swap...', {
      pool: params.pool.id,
      zeroForOne,
      amountIn: params.amountIn.toString(),
      router: routerAddress,
    });

    // 6. 调用 SimpleSwapRouter.swap
    const hash = await walletClient.writeContract({
      address: routerAddress,
      abi: SIMPLE_SWAP_ROUTER_ABI,
      functionName: 'swap',
      args: [poolKey, swapParams, hookData],
      value: 0n,
    });

    log.info('Swap 交易已提交', { hash });

    // 7. 等待确认
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === 'success') {
      log.info('Swap 成功', {
        hash,
        blockNumber: Number(receipt.blockNumber),
        gasUsed: receipt.gasUsed.toString(),
      });

      return {
        success: true,
        txHash: hash,
      };
    } else {
      throw new Error('Swap 交易回滚');
    }
  } catch (error) {
    log.error('Swap 执行失败', { error: String(error) });
    return {
      success: false,
      error: String(error),
    };
  }
}

/**
 * 获取报价（基于链上价格）
 */
export async function getQuote(
  pool: PoolConfig,
  tokenIn: Address,
  amountIn: bigint
): Promise<bigint> {
  try {
    const { price } = await getPoolPrice(pool);

    if (price === 0) {
      // fallback: 扣除手续费的 1:1 报价
      const fee = BigInt(pool.fee);
      return amountIn - (amountIn * fee) / 1000000n;
    }

    const zeroForOne = tokenIn.toLowerCase() === pool.token0.toLowerCase();

    // 根据方向计算输出
    let amountOut: bigint;
    if (zeroForOne) {
      amountOut = BigInt(Math.floor(Number(amountIn) * price));
    } else {
      amountOut = BigInt(Math.floor(Number(amountIn) / price));
    }

    // 扣除手续费
    const fee = BigInt(pool.fee);
    amountOut = amountOut - (amountOut * fee) / 1000000n;

    log.debug('报价', {
      pool: pool.id,
      tokenIn,
      amountIn: amountIn.toString(),
      amountOut: amountOut.toString(),
      price,
    });

    return amountOut;
  } catch (error) {
    log.error('获取报价失败', { error: String(error) });
    // fallback
    const fee = BigInt(pool.fee);
    return amountIn - (amountIn * fee) / 1000000n;
  }
}

/**
 * 检查套利机会
 */
export async function checkArbitrageOpportunity(
  pool: PoolConfig
): Promise<{ hasOpportunity: boolean; direction?: 'buy' | 'sell'; profit?: bigint }> {
  try {
    const { price, tick } = await getPoolPrice(pool);

    if (price === 0) {
      return { hasOpportunity: false };
    }

    // 简单的价格偏差检测
    // 比较链上价格和配置的参考价格
    const referencePrice = config.strategy.referencePrice?.[pool.id];

    if (!referencePrice) {
      log.debug('无参考价格，跳过套利检查', { pool: pool.id });
      return { hasOpportunity: false };
    }

    const deviation = Math.abs(price - referencePrice) / referencePrice;
    const threshold = config.strategy.arbitrageThreshold || 0.01; // 1%

    if (deviation > threshold) {
      const direction = price > referencePrice ? 'sell' : 'buy';
      
      // 估算利润（简化）
      const tradeAmount = parseUnits('0.1', 18); // 0.1 ETH
      const profitBps = Math.floor(deviation * 10000);

      log.info('发现套利机会', {
        pool: pool.id,
        direction,
        currentPrice: price,
        referencePrice,
        deviation: (deviation * 100).toFixed(2) + '%',
        profitBps,
      });

      return {
        hasOpportunity: true,
        direction,
        profit: BigInt(profitBps),
      };
    }

    return { hasOpportunity: false };
  } catch (error) {
    log.error('检查套利机会失败', { error: String(error) });
    return { hasOpportunity: false };
  }
}
