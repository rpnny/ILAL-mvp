/**
 * Example 3: Basic Swap
 * 展示如何执行代币交换
 */

import { ILALClient, BASE_SEPOLIA_TOKENS } from '@ilal/sdk';
import { parseUnits } from 'viem';

declare const client: ILALClient;

async function swapExample() {
  const { USDC, WETH } = BASE_SEPOLIA_TOKENS;

  // 1. 基本 Swap：100 USDC -> WETH
  console.log('Executing swap: 100 USDC -> WETH');
  
  const result = await client.swap.execute({
    tokenIn: USDC,
    tokenOut: WETH,
    amountIn: parseUnits('100', 6), // 100 USDC (6 decimals)
    slippageTolerance: 0.5, // 0.5%
  });

  console.log('Swap successful!');
  console.log('Transaction hash:', result.hash);
  console.log('Gas used:', result.gasUsed);

  // 2. 带自定义参数的 Swap
  const customSwap = await client.swap.execute({
    tokenIn: WETH,
    tokenOut: USDC,
    amountIn: parseUnits('0.05', 18), // 0.05 WETH
    slippageTolerance: 1.0, // 1%
    recipient: '0x...' as `0x${string}`, // 可选：指定接收地址
    deadline: BigInt(Math.floor(Date.now() / 1000) + 1200), // 20 分钟
  });

  // 3. 估算输出金额（只读）
  const estimatedOutput = await client.swap.estimateOutput({
    tokenIn: USDC,
    tokenOut: WETH,
    amountIn: parseUnits('100', 6),
  });
  console.log('Estimated output:', estimatedOutput);

  // 4. 查询代币余额
  const usdcBalance = await client.swap.getBalance(USDC);
  const wethBalance = await client.swap.getBalance(WETH);
  console.log('USDC balance:', usdcBalance);
  console.log('WETH balance:', wethBalance);

  // 5. 获取代币信息
  const tokenInfo = await client.swap.getTokenInfo(USDC);
  console.log('Token info:', tokenInfo);
  // { decimals: 6, symbol: 'USDC', name: 'USD Coin' }
}

// 错误处理示例
async function swapWithErrorHandling() {
  try {
    await client.swap.execute({
      tokenIn: BASE_SEPOLIA_TOKENS.USDC,
      tokenOut: BASE_SEPOLIA_TOKENS.WETH,
      amountIn: parseUnits('1000000', 6), // 超大金额
    });
  } catch (error: any) {
    if (error.code === 'INSUFFICIENT_LIQUIDITY') {
      console.error('Pool has insufficient liquidity');
    } else if (error.code === 'SLIPPAGE_EXCEEDED') {
      console.error('Price moved beyond slippage tolerance');
    } else {
      console.error('Swap failed:', error.message);
    }
  }
}

swapExample().catch(console.error);
