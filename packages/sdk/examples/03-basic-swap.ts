/**
 * Example 3: Basic Swap
 * 展示如何通过 SDK 执行链上 Swap
 *
 * 运行:
 *   PRIVATE_KEY=0x... npx tsx packages/sdk/examples/03-basic-swap.ts
 *
 * 前提:
 *   - 钱包有活跃的 ILAL 合规 Session（先跑 02-session-management 检查）
 *   - 钱包有足够的 USDC（Base Sepolia 测试 USDC）
 *   - 已授权 SimpleSwapRouter 使用 USDC
 */

import { createPublicClient, createWalletClient, http, parseUnits, type Hex } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { ILALClient, BASE_SEPOLIA_TOKENS } from '@ilal/sdk';

const PRIVATE_KEY = process.env.PRIVATE_KEY as Hex;
if (!PRIVATE_KEY) { console.error('❌ Set PRIVATE_KEY env var'); process.exit(1); }

const account      = privateKeyToAccount(PRIVATE_KEY);
const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http('https://sepolia.base.org') });
const publicClient = createPublicClient({ chain: baseSepolia, transport: http('https://sepolia.base.org') });

const client = new ILALClient({ walletClient, publicClient, chainId: 84532 });

async function swapExample() {
  const { USDC, WETH } = BASE_SEPOLIA_TOKENS;

  // 检查 Session
  const sessionActive = await client.session.isActive();
  if (!sessionActive) {
    console.error('❌ No active compliance session. Submit ZK Proof via API first.');
    process.exit(1);
  }
  console.log('✅ Session active');

  // 查询余额
  const usdcBefore = await client.swap.getBalance(USDC);
  const wethBefore = await client.swap.getBalance(WETH);
  console.log(`\nBefore: USDC=${usdcBefore} | WETH=${wethBefore}`);

  // 执行 Swap: 0.01 USDC → WETH
  console.log('\nExecuting swap: 0.01 USDC → WETH ...');
  const result = await client.swap.execute({
    tokenIn: USDC,
    tokenOut: WETH,
    amountIn: parseUnits('0.01', 6), // 0.01 USDC (6 decimals)
    slippageTolerance: 0.5,          // 0.5%
  });

  console.log('✅ Swap successful!');
  console.log('   TX hash:', result.hash);
  console.log('   Gas used:', result.gasUsed);
  console.log('   Explorer: https://sepolia.basescan.org/tx/' + result.hash);

  // 查询余额变化
  const usdcAfter = await client.swap.getBalance(USDC);
  const wethAfter = await client.swap.getBalance(WETH);
  console.log(`\nAfter:  USDC=${usdcAfter} | WETH=${wethAfter}`);
}

swapExample().catch(err => { console.error('Error:', err.message); process.exit(1); });
