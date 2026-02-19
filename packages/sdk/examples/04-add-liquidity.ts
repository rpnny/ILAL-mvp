/**
 * Example 4: Add Liquidity
 * How to add liquidity
 */

import { ILALClient, BASE_SEPOLIA_TOKENS } from '@ilal/sdk';
import { parseUnits, parseEther } from 'viem';

declare const client: ILALClient;

async function addLiquidityExample() {
  const { USDC, WETH } = BASE_SEPOLIA_TOKENS;

  // Ensure session is active first: await client.session.activate({ expiry: 24 * 3600 });
  // Define pool key
  const poolKey = {
    currency0: USDC,
    currency1: WETH,
    fee: 500, // 0.05%
    tickSpacing: 10,
    hooks: client.addresses.complianceHook,
  };

  // 1. Add liquidity in a price range
  console.log('Adding liquidity...');
  
  const result = await client.liquidity.add({
    poolKey,
    tickLower: 190700, // lower price bound
    tickUpper: 196250, // upper price bound
    amount0Desired: parseUnits('100', 6), // 100 USDC
    amount1Desired: parseEther('0.05'), // 0.05 WETH
    amount0Min: parseUnits('95', 6), // min 95 USDC (5% slippage)
    amount1Min: parseEther('0.0475'), // min 0.0475 WETH
  });

  console.log('Liquidity added!');
  console.log('Transaction hash:', result.hash);
  console.log('Token ID:', result.tokenId);
  console.log('Liquidity:', result.liquidity);
  console.log('Actual amounts used:', {
    amount0: result.amount0,
    amount1: result.amount1,
  });

  // 2. Query liquidity position
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

  // 3. Query all user positions
  const userPositions = await client.liquidity.getUserPositions();
  console.log('Total positions:', userPositions.length);

  // 4. Remove liquidity
  if (result.tokenId) {
    console.log('Removing liquidity...');
    
    const removeResult = await client.liquidity.remove({
      tokenId: result.tokenId,
      liquidity: result.liquidity, // remove full liquidity
      amount0Min: 0n, // no minimum
      amount1Min: 0n,
    });

    console.log('Liquidity removed!');
    console.log('Received:', {
      amount0: removeResult.amount0,
      amount1: removeResult.amount1,
    });
  }
}

// Single-sided liquidity example (WETH only)
async function singleSidedLiquidity() {
  const poolKey = {
    currency0: BASE_SEPOLIA_TOKENS.USDC,
    currency1: BASE_SEPOLIA_TOKENS.WETH,
    fee: 500,
    tickSpacing: 10,
    hooks: client.addresses.complianceHook,
  };

  // WETH only; price range above current price
  await client.liquidity.add({
    poolKey,
    tickLower: 196250, // above current price
    tickUpper: 201800,
    amount0Desired: 0n, // no USDC
    amount1Desired: parseEther('0.1'), // 0.1 WETH only
  });
}

addLiquidityExample().catch(console.error);
