/**
 * Example 4: Add Liquidity
 * 展示如何向 ILAL 合规池添加流动性
 *
 * 运行:
 *   PRIVATE_KEY=0x... npx tsx packages/sdk/examples/04-add-liquidity.ts
 *
 * 前提: 钱包有活跃的合规 Session + 足够的 mUSD / mTBILL
 * 池子: mUSD/mTBILL fee=500 tickSpacing=10 (约 1:1 价格)
 */

import { ILALClient, BASE_SEPOLIA_TOKENS } from '@ilal/sdk';
import { createPublicClient, createWalletClient, http, parseUnits, type Hex } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const PRIVATE_KEY = process.env.PRIVATE_KEY as Hex;
if (!PRIVATE_KEY) { console.error('❌ Set PRIVATE_KEY env var'); process.exit(1); }

const account      = privateKeyToAccount(PRIVATE_KEY);
const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http('https://sepolia.base.org') });
const publicClient = createPublicClient({ chain: baseSepolia, transport: http('https://sepolia.base.org') });
const client = new ILALClient({ walletClient, publicClient, chainId: 84532 });

async function addLiquidityExample() {
  // mUSD/mTBILL — the initialized ILAL compliance pool on Base Sepolia (both 18 decimals)
  const { mUSD, mTBILL } = BASE_SEPOLIA_TOKENS;

  const sessionActive = await client.session.isActive();
  if (!sessionActive) {
    console.error('❌ No active compliance session. Run example 02 first.');
    process.exit(1);
  }
  console.log('✅ Session active');

  const poolKey = {
    currency0: mUSD,
    currency1: mTBILL,
    fee: 500,        // 0.05%
    tickSpacing: 10,
    hooks: client.addresses.complianceHook,
  };

  // Tick range for ~1:1 price pool (mUSD ≈ mTBILL)
  // tick=0 corresponds to price 1.0; use ±100 ticks (~1% range)
  const tickLower = -100;
  const tickUpper =  100;

  console.log('\nAdding liquidity to mUSD/mTBILL pool...');

  const result = await client.liquidity.add({
    poolKey,
    tickLower,
    tickUpper,
    amount0Desired: parseUnits('10', 18),   // 10 mUSD
    amount1Desired: parseUnits('10', 18),   // 10 mTBILL
    amount0Min:     parseUnits('9.5', 18),  // 5% slippage
    amount1Min:     parseUnits('9.5', 18),
  });

  console.log('\n✅ Liquidity added!');
  console.log('   TX hash:', result.hash);
  console.log('   Explorer: https://sepolia.basescan.org/tx/' + result.hash);
  console.log('   Token ID:', result.tokenId?.toString());
  console.log('   Liquidity:', result.liquidity?.toString());
  console.log('   Amounts used:', {
    mUSD:   result.amount0?.toString(),
    mTBILL: result.amount1?.toString(),
  });

  // Query position
  if (result.tokenId) {
    const position = await client.liquidity.getPosition(result.tokenId);
    if (position) {
      console.log('\n   Position:', {
        tickLower: position.tickLower,
        tickUpper: position.tickUpper,
        liquidity: position.liquidity.toString(),
      });
    }
  }

  // All positions
  const userPositions = await client.liquidity.getUserPositions();
  console.log('   Total positions:', userPositions.length);
}

addLiquidityExample().catch((err) => { console.error(err); process.exit(1); });
