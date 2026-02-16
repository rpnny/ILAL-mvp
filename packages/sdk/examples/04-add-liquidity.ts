/**
 * Example 4: Add Liquidity
 * 展示如何添加流动性
 */

import { ILALClient, BASE_SEPOLIA_TOKENS } from '@ilal/sdk';
import { parseUnits, parseEther } from 'viem';

declare const client: ILALClient;

async function addLiquidityExample() {
  const { USDC, WETH } = BASE_SEPOLIA_TOKENS;

  // 定义 Pool Key
  const poolKey = {
    currency0: USDC,
    currency1: WETH,
    fee: 500, // 0.05%
    tickSpacing: 10,
    hooks: client.addresses.complianceHook,
  };

  // 1. 添加流动性到指定价格范围
  console.log('Adding liquidity...');
  
  const result = await client.liquidity.add({
    poolKey,
    tickLower: 190700, // 价格下界
    tickUpper: 196250, // 价格上界
    amount0Desired: parseUnits('100', 6), // 100 USDC
    amount1Desired: parseEther('0.05'), // 0.05 WETH
    amount0Min: parseUnits('95', 6), // 最小 95 USDC（5% 滑点）
    amount1Min: parseEther('0.0475'), // 最小 0.0475 WETH
  });

  console.log('Liquidity added!');
  console.log('Transaction hash:', result.hash);
  console.log('Token ID:', result.tokenId);
  console.log('Liquidity:', result.liquidity);
  console.log('Actual amounts used:', {
    amount0: result.amount0,
    amount1: result.amount1,
  });

  // 2. 查询流动性头寸
  if (result.tokenId) {
    const position = await client.liquidity.getPosition(result.tokenId);
    if (position) {
      console.log('Position details:', {
        tickLower: position.tickLower,
        tickUpper: position.tickUpper,
        liquidity: position.liquidity,
      });
    }
  }

  // 3. 查询用户所有头寸
  const userPositions = await client.liquidity.getUserPositions();
  console.log('Total positions:', userPositions.length);

  // 4. 移除流动性
  if (result.tokenId) {
    console.log('Removing liquidity...');
    
    const removeResult = await client.liquidity.remove({
      tokenId: result.tokenId,
      liquidity: result.liquidity, // 移除全部流动性
      amount0Min: 0n, // 不设置最小值
      amount1Min: 0n,
    });

    console.log('Liquidity removed!');
    console.log('Received:', {
      amount0: removeResult.amount0,
      amount1: removeResult.amount1,
    });
  }
}

// 单边流动性示例（仅 WETH）
async function singleSidedLiquidity() {
  const poolKey = {
    currency0: BASE_SEPOLIA_TOKENS.USDC,
    currency1: BASE_SEPOLIA_TOKENS.WETH,
    fee: 500,
    tickSpacing: 10,
    hooks: client.addresses.complianceHook,
  };

  // 仅提供 WETH，设置价格范围在当前价格之上
  await client.liquidity.add({
    poolKey,
    tickLower: 196250, // 当前价格之上
    tickUpper: 201800,
    amount0Desired: 0n, // 不提供 USDC
    amount1Desired: parseEther('0.1'), // 仅 0.1 WETH
  });
}

addLiquidityExample().catch(console.error);
