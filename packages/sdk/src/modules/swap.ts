/**
 * Swap 模块
 * 提供代币交换功能
 */

import { type Address, type Hex, type PublicClient, type WalletClient, decodeEventLog } from 'viem';
import type { SwapParams, SwapResult, PoolKey } from '../types';
import { simpleSwapRouterABI, ERC20_ABI } from '../constants/abis';
import { MIN_SQRT_PRICE, MAX_SQRT_PRICE, DEFAULT_SLIPPAGE_TOLERANCE } from '../constants';
import { validateSwapParams } from '../utils/validation';
import { sortTokens, DIRECT_HOOK_DATA } from '../utils';
import { createSignedSwapPermit } from '../utils/eip712';
import { InsufficientLiquidityError, SlippageExceededError } from '../utils/errors';

export class SwapModule {
  constructor(
    private walletClient: WalletClient,
    private publicClient: PublicClient,
    private swapRouterAddress: Address,
    private complianceHookAddress: Address
  ) {}

  /**
   * 执行代币交换
   * @param params - Swap 参数
   * @returns Swap 结果
   */
  async execute(params: SwapParams): Promise<SwapResult> {
    // 1. 验证参数
    const validation = validateSwapParams(params);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // 2. 获取用户地址
    const user = params.recipient || (this.walletClient.account?.address as Address);
    if (!user) {
      throw new Error('No user address available');
    }

    // 3. 确定代币顺序和交换方向
    const [currency0, currency1, zeroForOne] = sortTokens(params.tokenIn, params.tokenOut);

    // 4. 构建 Pool Key
    const poolKey: PoolKey = {
      currency0,
      currency1,
      fee: 500, // 0.05%
      tickSpacing: 10,
      hooks: this.complianceHookAddress,
    };

    // 5. 检查并授权代币
    await this.ensureAllowance(params.tokenIn, params.amountIn, user);

    // 6. 计算价格限制
    const sqrtPriceLimitX96 = params.sqrtPriceLimitX96 || 
      (zeroForOne ? MIN_SQRT_PRICE + 1n : MAX_SQRT_PRICE - 1n);

    // 7. hookData = 0x → v2 router auto-injects abi.encode(msg.sender) (Mode 2)
    const hookData = DIRECT_HOOK_DATA;

    // 8. 计算 minAmountOut（滑点保护）
    const slippageBps = BigInt(Math.floor((params.slippageTolerance ?? DEFAULT_SLIPPAGE_TOLERANCE) * 100));
    const minAmountOut = slippageBps > 0n
      ? (params.amountIn * (10000n - slippageBps)) / 10000n
      : 0n;

    // 9. 执行 Swap
    try {
      const hash = await this.walletClient.writeContract({
        address: this.swapRouterAddress,
        abi: simpleSwapRouterABI,
        functionName: 'swap',
        chain: this.walletClient.chain ?? undefined,
        args: [
          poolKey,
          {
            zeroForOne,
            amountSpecified: -BigInt(params.amountIn),
            sqrtPriceLimitX96,
          },
          hookData,
          minAmountOut,
        ],
        account: this.walletClient.account ?? user,
      });

      // 10. 等待交易确认
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

      // 11. 解析交易结果（从 SwapExecuted 事件提取实际金额）
      let amount0 = 0n;
      let amount1 = 0n;
      for (const log of receipt.logs) {
        try {
          if (log.address.toLowerCase() === this.swapRouterAddress.toLowerCase() && log.topics[0]) {
            const decoded = decodeEventLog({
              abi: simpleSwapRouterABI,
              eventName: 'SwapExecuted',
              data: log.data,
              topics: log.topics,
            });
            if (decoded.args) {
              const args = decoded.args as any;
              amount0 = args.amount0 ?? 0n;
              amount1 = args.amount1 ?? 0n;
              break;
            }
          }
        } catch { /* skip non-matching logs */ }
      }

      const result: SwapResult = {
        hash,
        amount0,
        amount1,
        gasUsed: receipt.gasUsed,
      };

      return result;
    } catch (error: any) {
      // 解析合约错误
      if (error.message?.includes('InsufficientLiquidity')) {
        throw new InsufficientLiquidityError({ params, originalError: error });
      }
      if (error.message?.includes('PRICE_LIMIT')) {
        throw new SlippageExceededError({ params, originalError: error });
      }
      throw error;
    }
  }

  /**
   * 使用 Mode 1 (EIP-712 permit) 执行 Swap
   *
   * 与 execute() 的区别：此方法让用户签名一个 EIP-712 SwapPermit，
   * 将签名编码进 hookData，由 ComplianceHook 在链上验证用户身份。
   * 注意：当前链上逻辑仍要求该用户已有有效 session。
   *
   * @param params - Swap 参数
   * @param chainId - 链 ID（用于 EIP-712 domain）
   */
  async executeWithPermit(params: SwapParams, chainId: number): Promise<SwapResult> {
    const validation = validateSwapParams(params);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const user = params.recipient || (this.walletClient.account?.address as Address);
    if (!user) {
      throw new Error('No user address available');
    }

    const [currency0, currency1, zeroForOne] = sortTokens(params.tokenIn, params.tokenOut);

    const poolKey: PoolKey = {
      currency0,
      currency1,
      fee: 500,
      tickSpacing: 10,
      hooks: this.complianceHookAddress,
    };

    await this.ensureAllowance(params.tokenIn, params.amountIn, user);

    const sqrtPriceLimitX96 = params.sqrtPriceLimitX96 ||
      (zeroForOne ? MIN_SQRT_PRICE + 1n : MAX_SQRT_PRICE - 1n);

    const hookData: Hex = await createSignedSwapPermit(
      this.walletClient,
      this.publicClient,
      this.complianceHookAddress,
      chainId,
      user,
    );

    const slippageBps = BigInt(Math.floor((params.slippageTolerance ?? DEFAULT_SLIPPAGE_TOLERANCE) * 100));
    const minAmountOut = slippageBps > 0n
      ? (params.amountIn * (10000n - slippageBps)) / 10000n
      : 0n;

    try {
      const hash = await this.walletClient.writeContract({
        address: this.swapRouterAddress,
        abi: simpleSwapRouterABI,
        functionName: 'swap',
        chain: this.walletClient.chain ?? undefined,
        args: [
          poolKey,
          {
            zeroForOne,
            amountSpecified: -BigInt(params.amountIn),
            sqrtPriceLimitX96,
          },
          hookData,
          minAmountOut,
        ],
        account: this.walletClient.account ?? user,
      });

      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

      let amount0 = 0n;
      let amount1 = 0n;
      for (const log of receipt.logs) {
        try {
          if (log.address.toLowerCase() === this.swapRouterAddress.toLowerCase() && log.topics[0]) {
            const decoded = decodeEventLog({
              abi: simpleSwapRouterABI,
              eventName: 'SwapExecuted',
              data: log.data,
              topics: log.topics,
            });
            if (decoded.args) {
              const args = decoded.args as any;
              amount0 = args.amount0 ?? 0n;
              amount1 = args.amount1 ?? 0n;
              break;
            }
          }
        } catch { /* skip non-matching logs */ }
      }

      return { hash, amount0, amount1, gasUsed: receipt.gasUsed };
    } catch (error: any) {
      if (error.message?.includes('InsufficientLiquidity')) {
        throw new InsufficientLiquidityError({ params, originalError: error });
      }
      if (error.message?.includes('PRICE_LIMIT')) {
        throw new SlippageExceededError({ params, originalError: error });
      }
      throw error;
    }
  }

  /**
   * 估算 Swap 输出金额（只读调用）
   */
  async estimateOutput(params: SwapParams): Promise<bigint> {
    const [currency0, currency1, zeroForOne] = sortTokens(params.tokenIn, params.tokenOut);

    const poolKey: PoolKey = {
      currency0,
      currency1,
      fee: 500,
      tickSpacing: 10,
      hooks: this.complianceHookAddress,
    };

    try {
      const { result } = await this.publicClient.simulateContract({
        address: this.swapRouterAddress,
        abi: simpleSwapRouterABI,
        functionName: 'swap',
        args: [
          poolKey,
          {
            zeroForOne,
            amountSpecified: -BigInt(params.amountIn),
            sqrtPriceLimitX96: zeroForOne ? MIN_SQRT_PRICE + 1n : MAX_SQRT_PRICE - 1n,
          },
          DIRECT_HOOK_DATA,
          0n,
        ],
        account: this.walletClient.account?.address,
      });

      return result as bigint;
    } catch (error) {
      throw new Error('Failed to estimate swap output');
    }
  }

  /**
   * 获取代币余额
   */
  async getBalance(token: Address, user?: Address): Promise<bigint> {
    const userAddress = user || (this.walletClient.account?.address as Address);
    if (!userAddress) {
      throw new Error('No user address available');
    }

    const balance = await this.publicClient.readContract({
      address: token,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [userAddress],
    });

    return balance as bigint;
  }

  /**
   * 检查并授权代币
   */
  async ensureAllowance(
    token: Address,
    amount: bigint,
    user: Address
  ): Promise<void> {
    // 1. 检查当前授权额度
    const currentAllowance = await this.publicClient.readContract({
      address: token,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [user, this.swapRouterAddress],
    }) as bigint;

    // 2. 如果授权不足，执行授权
    if (currentAllowance < amount) {
      const hash = await this.walletClient.writeContract({
        address: token,
        abi: ERC20_ABI,
        functionName: 'approve',
        chain: this.walletClient.chain ?? undefined,
        args: [this.swapRouterAddress, amount],
        account: this.walletClient.account ?? user,
      });

      // 等待授权交易确认
      await this.publicClient.waitForTransactionReceipt({ hash });
    }
  }

  /**
   * 获取代币信息
   */
  async getTokenInfo(token: Address): Promise<{
    decimals: number;
    symbol: string;
    name: string;
  }> {
    const [decimals, symbol, name] = await Promise.all([
      this.publicClient.readContract({
        address: token,
        abi: ERC20_ABI,
        functionName: 'decimals',
      }) as Promise<number>,
      this.publicClient.readContract({
        address: token,
        abi: ERC20_ABI,
        functionName: 'symbol',
      }) as Promise<string>,
      this.publicClient.readContract({
        address: token,
        abi: ERC20_ABI,
        functionName: 'name',
      }) as Promise<string>,
    ]);

    return { decimals, symbol, name };
  }

  /**
   * 计算带滑点的最小输出金额
   */
  calculateMinOutput(estimatedOutput: bigint, slippageTolerance: number = DEFAULT_SLIPPAGE_TOLERANCE): bigint {
    const slippageBps = BigInt(Math.floor(slippageTolerance * 100));
    return (estimatedOutput * (10000n - slippageBps)) / 10000n;
  }
}
