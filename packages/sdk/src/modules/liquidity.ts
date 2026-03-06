/**
 * Liquidity 模块
 * 提供流动性管理功能
 */

import type { Address, PublicClient, WalletClient } from 'viem';
import type { LiquidityParams, RemoveLiquidityParams, LiquidityResult, LiquidityPosition } from '../types';
import { positionManagerABI, ERC20_ABI } from '../constants/abis';
import { validateLiquidityParams } from '../utils/validation';
import { DIRECT_HOOK_DATA, tickToSqrtPriceX96, getLiquidityForAmounts } from '../utils';

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

    // 3. 检查并授权代币（授权给 PositionManager）
    await Promise.all([
      this.ensureAllowance(params.poolKey.currency0, params.amount0Desired, user),
      this.ensureAllowance(params.poolKey.currency1, params.amount1Desired, user),
    ]);

    // 4. 计算 liquidity（合约 mint 接受 liquidity 而非 token amounts）
    const sqrtPriceLower = tickToSqrtPriceX96(params.tickLower);
    const sqrtPriceUpper = tickToSqrtPriceX96(params.tickUpper);
    const sqrtPriceCurrent = tickToSqrtPriceX96(
      Math.floor((params.tickLower + params.tickUpper) / 2)
    );
    const liquidity = getLiquidityForAmounts(
      sqrtPriceCurrent,
      sqrtPriceLower,
      sqrtPriceUpper,
      params.amount0Desired,
      params.amount1Desired,
    );

    if (liquidity === 0n) {
      throw new Error('Computed liquidity is zero; increase token amounts or narrow price range');
    }

    // 5. hookData = 0x (Mode 2: EOA 直接调用)
    const hookData = DIRECT_HOOK_DATA;

    // 6. 执行添加流动性 — 合约签名: mint(poolKey, tickLower, tickUpper, liquidity, hookData)
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
          liquidity,
          hookData,
        ],
        account: user,
      });

      // 7. 等待交易确认
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

      // 8. 从 PositionMinted 事件提取 tokenId 和 liquidity
      let tokenId = 0n;
      let mintedLiquidity = liquidity;
      for (const log of receipt.logs) {
        try {
          if (log.address.toLowerCase() === this.positionManagerAddress.toLowerCase()) {
            const decoded = (this.publicClient as any).decodeEventLog?.({
              abi: positionManagerABI,
              eventName: 'PositionMinted',
              data: log.data,
              topics: log.topics,
            });
            if (decoded?.args) {
              tokenId = decoded.args.tokenId ?? 0n;
              mintedLiquidity = decoded.args.liquidity ?? liquidity;
              break;
            }
          }
        } catch { /* skip non-matching logs */ }
      }

      return {
        hash,
        tokenId,
        liquidity: mintedLiquidity,
        amount0: params.amount0Desired,
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

    const hookData = DIRECT_HOOK_DATA;

    try {
      const hash = await this.walletClient.writeContract({
        address: this.positionManagerAddress,
        abi: positionManagerABI,
        functionName: 'decreaseLiquidity',
        chain: undefined,
        args: [
          params.tokenId,
          params.liquidity,
          hookData,
        ],
        account: user,
      });

      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

      let removedLiquidity = params.liquidity;
      for (const log of receipt.logs) {
        try {
          if (log.address.toLowerCase() === this.positionManagerAddress.toLowerCase()) {
            const decoded = (this.publicClient as any).decodeEventLog?.({
              abi: positionManagerABI,
              eventName: 'LiquidityDecreased',
              data: log.data,
              topics: log.topics,
            });
            if (decoded?.args) {
              removedLiquidity = decoded.args.liquidityDelta ?? params.liquidity;
              break;
            }
          }
        } catch { /* skip non-matching logs */ }
      }

      return {
        hash,
        liquidity: removedLiquidity,
        amount0: 0n,
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

    const nextTokenId = await this.publicClient.readContract({
      address: this.positionManagerAddress,
      abi: positionManagerABI,
      functionName: 'nextTokenId',
    }) as bigint;

    const positions: LiquidityPosition[] = [];
    for (let id = 1n; id < nextTokenId; id++) {
      try {
        const owner = await this.publicClient.readContract({
          address: this.positionManagerAddress,
          abi: positionManagerABI,
          functionName: 'ownerOf',
          args: [id],
        }) as Address;

        if (owner.toLowerCase() === userAddress.toLowerCase()) {
          const pos = await this.getPosition(id);
          if (pos && pos.liquidity > 0n) {
            positions.push(pos);
          }
        }
      } catch { /* token may not exist */ }
    }

    return positions;
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

    return getLiquidityForAmounts(
      sqrtPriceCurrent,
      sqrtPriceLower,
      sqrtPriceUpper,
      amount0,
      amount1,
    );
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
