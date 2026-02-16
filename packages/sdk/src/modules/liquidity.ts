/**
 * Liquidity 模块
 * 提供流动性管理功能
 */

import type { Address, PublicClient, WalletClient } from 'viem';
import type { LiquidityParams, RemoveLiquidityParams, LiquidityResult, LiquidityPosition } from '../types';
import { positionManagerABI, ERC20_ABI } from '../constants/abis';
import { validateLiquidityParams } from '../utils/validation';
import { encodeWhitelistHookData, tickToSqrtPriceX96 } from '../utils';

export class LiquidityModule {
  constructor(
    private walletClient: WalletClient,
    private publicClient: PublicClient,
    private positionManagerAddress: Address,
    private complianceHookAddress: Address
  ) {}

  /**
   * 添加流动性
   * @param params - 流动性参数
   * @returns 流动性结果
   */
  async add(params: LiquidityParams): Promise<LiquidityResult> {
    // 1. 验证参数
    const validation = validateLiquidityParams(params);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // 2. 获取用户地址
    const user = params.recipient || (this.walletClient.account?.address as Address);
    if (!user) {
      throw new Error('No user address available');
    }

    // 3. 检查并授权代币
    await Promise.all([
      this.ensureAllowance(params.poolKey.currency0, params.amount0Desired, user),
      this.ensureAllowance(params.poolKey.currency1, params.amount1Desired, user),
    ]);

    // 4. 设置最小金额（如果未指定）
    const amount0Min = params.amount0Min || (params.amount0Desired * 95n) / 100n; // 5% 滑点
    const amount1Min = params.amount1Min || (params.amount1Desired * 95n) / 100n;

    // 5. 构建 hookData
    const hookData = encodeWhitelistHookData(user);

    // 6. 执行添加流动性
    try {
      const hash = await this.walletClient.writeContract({
        address: this.positionManagerAddress,
        abi: positionManagerABI,
        functionName: 'mint',
        chain: undefined,
        args: [
          params.poolKey,
          params.tickLower,
          params.tickUpper,
          params.amount0Desired,
          params.amount1Desired,
          amount0Min,
          amount1Min,
          user,
          params.deadline || BigInt(Math.floor(Date.now() / 1000) + 1200),
          hookData,
        ],
        account: user,
      });

      // 7. 等待交易确认
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

      // 8. 从事件日志中提取 tokenId
      // TODO: 解析 PositionMinted 事件
      const tokenId = 0n;  // 从日志中提取

      return {
        hash,
        tokenId,
        liquidity: 0n,  // 从日志中提取
        amount0: params.amount0Desired,  // 实际使用的金额从日志提取
        amount1: params.amount1Desired,
      };
    } catch (error: any) {
      throw new Error(`Add liquidity failed: ${error.message}`);
    }
  }

  /**
   * 移除流动性
   * @param params - 移除参数
   * @returns 移除结果
   */
  async remove(params: RemoveLiquidityParams): Promise<LiquidityResult> {
    const user = this.walletClient.account?.address as Address;
    if (!user) {
      throw new Error('No user address available');
    }

    const amount0Min = params.amount0Min || 0n;
    const amount1Min = params.amount1Min || 0n;
    const hookData = encodeWhitelistHookData(user);

    try {
      const hash = await this.walletClient.writeContract({
        address: this.positionManagerAddress,
        abi: positionManagerABI,
        functionName: 'burn',
        chain: undefined,
        args: [
          params.tokenId,
          params.liquidity,
          amount0Min,
          amount1Min,
          params.deadline || BigInt(Math.floor(Date.now() / 1000) + 1200),
          hookData,
        ],
        account: user,
      });

      await this.publicClient.waitForTransactionReceipt({ hash });

      return {
        hash,
        liquidity: params.liquidity,
        amount0: 0n,  // 从日志中提取
        amount1: 0n,
      };
    } catch (error: any) {
      throw new Error(`Remove liquidity failed: ${error.message}`);
    }
  }

  /**
   * 查询流动性头寸
   * @param tokenId - NFT token ID
   * @returns 头寸信息
   */
  async getPosition(tokenId: bigint): Promise<LiquidityPosition | null> {
    try {
      const position = await this.publicClient.readContract({
        address: this.positionManagerAddress,
        abi: positionManagerABI,
        functionName: 'getPosition',
        args: [tokenId],
      }) as any;

      // 解析返回的头寸数据
      return {
        tokenId,
        poolKey: position.poolKey,
        tickLower: position.tickLower,
        tickUpper: position.tickUpper,
        liquidity: position.liquidity,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * 获取用户所有流动性头寸
   */
  async getUserPositions(user?: Address): Promise<LiquidityPosition[]> {
    const userAddress = user || (this.walletClient.account?.address as Address);
    if (!userAddress) {
      throw new Error('No user address available');
    }

    // TODO: 实现从合约或 subgraph 查询用户的所有头寸
    return [];
  }

  /**
   * 计算给定价格范围内的流动性
   */
  calculateLiquidity(
    amount0: bigint,
    amount1: bigint,
    tickLower: number,
    tickUpper: number,
    currentTick: number
  ): bigint {
    const sqrtPriceLower = tickToSqrtPriceX96(tickLower);
    const sqrtPriceUpper = tickToSqrtPriceX96(tickUpper);
    const sqrtPriceCurrent = tickToSqrtPriceX96(currentTick);

    // 简化的流动性计算
    // TODO: 使用完整的 Uniswap V3/V4 流动性计算公式
    return 0n;
  }

  /**
   * 检查并授权代币给 PositionManager
   */
  private async ensureAllowance(
    token: Address,
    amount: bigint,
    user: Address
  ): Promise<void> {
    if (amount === 0n) return;

    const currentAllowance = await this.publicClient.readContract({
      address: token,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [user, this.positionManagerAddress],
    }) as bigint;

    if (currentAllowance < amount) {
      const hash = await this.walletClient.writeContract({
        address: token,
        abi: ERC20_ABI,
        functionName: 'approve',
        chain: undefined,
        args: [this.positionManagerAddress, amount],
        account: user,
      });

      await this.publicClient.waitForTransactionReceipt({ hash });
    }
  }
}
