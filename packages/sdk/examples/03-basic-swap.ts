/**
 * Example 3: Basic Swap
 * How to execute a token swap
 */

import { ILALClient, BASE_SEPOLIA_TOKENS } from '@ilal/sdk';
import { parseUnits } from 'viem';

declare const client: ILALClient;

async function swapExample() {
  const { USDC, WETH } = BASE_SEPOLIA_TOKENS;

  // Ensure session is active first: await client.session.activate({ expiry: 24 * 3600 });
  // 1. Basic swap: 100 USDC -> WETH
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

  // 2. Swap with custom params
  const customSwap = await client.swap.execute({
    tokenIn: WETH,
    tokenOut: USDC,
    amountIn: parseUnits('0.05', 18), // 0.05 WETH
    slippageTolerance: 1.0, // 1%
    recipient: '0x...' as `0x${string}`, // optional: recipient address
    deadline: BigInt(Math.floor(Date.now() / 1000) + 1200), // 20 min
  });

  // 3. Estimate output (read-only)
  const estimatedOutput = await client.swap.estimateOutput({
    tokenIn: USDC,
    tokenOut: WETH,
    amountIn: parseUnits('100', 6),
  });
  console.log('Estimated output:', estimatedOutput);

  // 4. Query token balances
  const usdcBalance = await client.swap.getBalance(USDC);
  const wethBalance = await client.swap.getBalance(WETH);
  console.log('USDC balance:', usdcBalance);
  console.log('WETH balance:', wethBalance);

  // 5. Get token info
  const tokenInfo = await client.swap.getTokenInfo(USDC);
  console.log('Token info:', tokenInfo);
  // { decimals: 6, symbol: 'USDC', name: 'USD Coin' }
}

// Error handling example
async function swapWithErrorHandling() {
  try {
    await client.swap.execute({
      tokenIn: BASE_SEPOLIA_TOKENS.USDC,
      tokenOut: BASE_SEPOLIA_TOKENS.WETH,
      amountIn: parseUnits('1000000', 6), // large amount
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
