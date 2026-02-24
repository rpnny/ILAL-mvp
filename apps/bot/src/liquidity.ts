import {
  type Address,
  parseUnits,
  formatUnits,
} from 'viem';
import {
  publicClient,
  walletClient,
  botAddress,
  contracts,
  POSITION_MANAGER_ABI,
} from './contracts.js';
import { config, type PoolConfig } from './config.js';
import { log } from './logger.js';
import { signLiquidityPermit } from './eip712.js';
import { ensureActiveSession } from './session.js';
import { getCurrentTick } from './swap.js';

// ============ 类型 ============

export interface Position {
  tokenId: bigint;
  pool: PoolConfig;
  poolId: string;
  tickLower: number;
  tickUpper: number;
  liquidity: bigint;
}

export interface AddLiquidityParams {
  pool: PoolConfig;
  tickLower: number;
  tickUpper: number;
  amount0: bigint;
  amount1: bigint;
}

export interface RemoveLiquidityParams {
  tokenId: bigint;
  liquidityPercent: number; // 0-100
}

// ============ 流动性管理 ============

/**
 * 获取当前持仓
 */
export async function getPositions(): Promise<Position[]> {
  try {
    // The VerifiedPoolsPositionManager does not have balanceOf.
    // Instead we query nextTokenId and loop over all NFTs up to nextTokenId.
    const nextTokenId = await publicClient.readContract({
      address: contracts.positionManager,
      abi: POSITION_MANAGER_ABI,
      functionName: 'nextTokenId',
    }) as bigint;

    log.debug('目前最大的 tokenId (下一个待分配)', { nextTokenId: nextTokenId.toString() });

    const positions: Position[] = [];

    // Iterate from 1 up to nextTokenId - 1
    for (let i = 1n; i < nextTokenId; i++) {
      try {
        const owner = await publicClient.readContract({
          address: contracts.positionManager,
          abi: POSITION_MANAGER_ABI,
          functionName: 'ownerOf',
          args: [i],
        });

        // 仅收集本 bot 的持仓
        if ((owner as string).toLowerCase() !== botAddress.toLowerCase()) {
          continue;
        }

        const positionData = await publicClient.readContract({
          address: contracts.positionManager,
          abi: POSITION_MANAGER_ABI,
          functionName: 'getPosition',
          args: [i],
        }) as any;

        const poolKey = positionData.poolKey;
        const pool = config.strategy.pools.find(p =>
          p.token0.toLowerCase() === poolKey.currency0.toLowerCase() &&
          p.token1.toLowerCase() === poolKey.currency1.toLowerCase() &&
          p.fee === poolKey.fee
        );

        if (!pool) {
          log.warn('找不到对应的池子配置', { tokenId: i.toString() });
          continue;
        }

        positions.push({
          tokenId: i,
          pool,
          poolId: pool.id,
          tickLower: positionData.tickLower,
          tickUpper: positionData.tickUpper,
          liquidity: positionData.liquidity,
        });

        log.debug('获取到持仓', {
          tokenId: i.toString(),
          pool: pool.id,
          liquidity: positionData.liquidity.toString(),
        });
      } catch (error) {
        // 如果 ownerOf throw error 或 owner 0，或者 Token 被 burning 导致报错，跳过
        log.error('获取持仓详情失败', { tokenId: i.toString(), error: String(error) });
      }
    }

    return positions;
  } catch (error) {
    log.error('获取持仓失败', { error: String(error) });
    return [];
  }
}

/**
 * 添加流动性
 */
export async function addLiquidity(params: AddLiquidityParams): Promise<{ success: boolean; tokenId?: bigint; txHash?: string; error?: string }> {
  try {
    // 1. 确保 Session 有效
    await ensureActiveSession();

    // 2. 生成签名
    log.info('生成 Liquidity Permit 签名...', {
      pool: params.pool.id,
      tickLower: params.tickLower,
      tickUpper: params.tickUpper,
    });

    const { hookData } = await signLiquidityPermit();

    // 3. 构造 poolKey
    const poolKey = {
      currency0: params.pool.token0,
      currency1: params.pool.token1,
      fee: params.pool.fee,
      tickSpacing: params.pool.tickSpacing,
      hooks: contracts.complianceHook,
    };

    // 4. 计算流动性
    // 简化计算：使用较小的金额作为流动性
    const liquidity = params.amount0 < params.amount1 ? params.amount0 : params.amount1;

    log.info('添加流动性...', {
      pool: params.pool.id,
      tickLower: params.tickLower,
      tickUpper: params.tickUpper,
      liquidity: liquidity.toString(),
    });

    // 5. 调用 mint
    const hash = await walletClient.writeContract({
      address: contracts.positionManager,
      abi: POSITION_MANAGER_ABI,
      functionName: 'mint',
      args: [poolKey, params.tickLower, params.tickUpper, liquidity, hookData],
      value: 0n, // 如果 token0 是 ETH，需要发送 value
    });

    log.info('流动性添加交易已提交', { hash });

    // 6. 等待确认
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === 'success') {
      log.info('流动性添加成功', { hash, blockNumber: receipt.blockNumber });

      // 从事件中解析 tokenId
      let tokenId: bigint | undefined;

      for (const eventLog of receipt.logs) {
        try {
          if (eventLog.address.toLowerCase() === contracts.positionManager.toLowerCase()) {
            // PositionMinted(uint256 indexed tokenId, address indexed owner, PoolKey poolKey)
            // keccak256("PositionMinted(uint256,address,(address,address,uint24,int24,address),uint128,int24,int24)")
            const positionMintedTopic = '0x' + 'PositionMinted'; // 从 logs 中按 address 匹配

            // 匹配来自 positionManager 的 log（第一个 indexed 参数是 tokenId）
            if (eventLog.topics.length >= 2) {
              tokenId = BigInt(eventLog.topics[1] || '0');
              if (tokenId > 0n) {
                log.info('解析到 tokenId', { tokenId: tokenId.toString() });
                break;
              }
            }
          }
        } catch (err) {
          // 忽略解析错误
        }
      }

      return {
        success: true,
        txHash: hash,
        tokenId,
      };
    } else {
      throw new Error('流动性添加交易失败');
    }
  } catch (error) {
    log.error('添加流动性失败', { error: String(error) });
    return {
      success: false,
      error: String(error),
    };
  }
}

/**
 * 移除流动性
 */
export async function removeLiquidity(params: RemoveLiquidityParams): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    // 1. 确保 Session 有效
    await ensureActiveSession();

    // 2. 生成签名
    const { hookData } = await signLiquidityPermit();

    // 3. 获取当前流动性
    const positionData = await publicClient.readContract({
      address: contracts.positionManager,
      abi: POSITION_MANAGER_ABI,
      functionName: 'getPosition',
      args: [params.tokenId],
    }) as any;

    const currentLiquidity = BigInt(positionData.liquidity || 0);

    log.debug('当前持仓流动性', {
      tokenId: params.tokenId.toString(),
      liquidity: currentLiquidity.toString(),
    });

    // 4. 计算要移除的流动性
    const liquidityToRemove = (currentLiquidity * BigInt(params.liquidityPercent)) / 100n;

    log.info('移除流动性...', {
      tokenId: params.tokenId.toString(),
      percent: params.liquidityPercent,
      liquidityToRemove: liquidityToRemove.toString(),
    });

    // 5. 调用 decreaseLiquidity
    const hash = await walletClient.writeContract({
      address: contracts.positionManager,
      abi: POSITION_MANAGER_ABI,
      functionName: 'decreaseLiquidity',
      args: [params.tokenId, liquidityToRemove, hookData],
    });

    log.info('流动性移除交易已提交', { hash });

    // 6. 等待确认
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === 'success') {
      log.info('流动性移除成功', { hash, blockNumber: receipt.blockNumber });
      return {
        success: true,
        txHash: hash,
      };
    } else {
      throw new Error('流动性移除交易失败');
    }
  } catch (error) {
    log.error('移除流动性失败', { error: String(error) });
    return {
      success: false,
      error: String(error),
    };
  }
}

/**
 * 计算最优价格范围
 */
export function calculateOptimalRange(
  currentTick: number,
  tickSpacing: number,
  rangePercent: { lower: number; upper: number }
): { tickLower: number; tickUpper: number } {
  // 根据价格百分比计算 tick 范围
  // 价格 = 1.0001^tick
  // tick = log(price) / log(1.0001)

  const tickLower = Math.floor(
    currentTick + Math.log(rangePercent.lower) / Math.log(1.0001)
  );
  const tickUpper = Math.ceil(
    currentTick + Math.log(rangePercent.upper) / Math.log(1.0001)
  );

  // 对齐到 tickSpacing
  const alignedLower = Math.floor(tickLower / tickSpacing) * tickSpacing;
  const alignedUpper = Math.ceil(tickUpper / tickSpacing) * tickSpacing;

  return {
    tickLower: alignedLower,
    tickUpper: alignedUpper,
  };
}

/**
 * 检查是否需要再平衡
 */
export async function checkRebalanceNeeded(
  position: Position,
  currentTick: number
): Promise<boolean> {
  const midTick = (position.tickLower + position.tickUpper) / 2;
  const range = position.tickUpper - position.tickLower;
  const deviation = Math.abs(currentTick - midTick) / range;

  const needsRebalance = deviation > config.strategy.rebalance.priceDeviationThreshold;

  log.debug('再平衡检查', {
    tokenId: position.tokenId.toString(),
    currentTick,
    midTick,
    deviation: deviation.toFixed(4),
    needsRebalance,
  });

  return needsRebalance;
}

/**
 * 执行再平衡
 */
export async function rebalance(position: Position, currentTick: number): Promise<void> {
  log.info('开始再平衡', {
    tokenId: position.tokenId.toString(),
    currentTick,
  });

  // 1. 移除当前流动性
  const removeResult = await removeLiquidity({
    tokenId: position.tokenId,
    liquidityPercent: 100,
  });

  if (!removeResult.success) {
    log.error('再平衡失败：无法移除流动性', { error: removeResult.error });
    return;
  }

  // 2. 计算新的价格范围
  const newRange = calculateOptimalRange(
    currentTick,
    position.pool.tickSpacing,
    config.strategy.priceRange
  );

  // 3. 获取当前持有的代币余额
  const ERC20_ABI = [
    {
      inputs: [{ name: 'account', type: 'address' }],
      name: 'balanceOf',
      outputs: [{ name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function',
    },
  ] as const;

  const [balance0, balance1] = await Promise.all([
    publicClient.readContract({
      address: position.pool.token0,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [botAddress],
    }) as Promise<bigint>,
    publicClient.readContract({
      address: position.pool.token1,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [botAddress],
    }) as Promise<bigint>,
  ]);

  log.info('当前代币余额', {
    token0: formatUnits(balance0, 18),
    token1: formatUnits(balance1, 6),
  });

  // 4. 添加新的流动性
  const addResult = await addLiquidity({
    pool: position.pool,
    tickLower: newRange.tickLower,
    tickUpper: newRange.tickUpper,
    amount0: balance0,
    amount1: balance1,
  });

  if (addResult.success) {
    log.info('再平衡完成', {
      oldRange: `${position.tickLower} - ${position.tickUpper}`,
      newRange: `${newRange.tickLower} - ${newRange.tickUpper}`,
    });
  } else {
    log.error('再平衡失败：无法添加流动性', { error: addResult.error });
  }
}
