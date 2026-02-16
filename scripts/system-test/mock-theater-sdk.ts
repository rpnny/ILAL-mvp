/**
 * ILAL Mock Theater - SDK 版本
 * 
 * 使用 @ilal/sdk 重写的集成测试
 * 展示 SDK 的实际使用效果
 */

import { ILALClient, BASE_SEPOLIA_TOKENS } from '../../packages/sdk/src';
import { parseEther, parseUnits, formatEther, formatUnits, type Hex } from 'viem';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ============ 配置 ============

const RPC_URL = 'https://base-sepolia-rpc.publicnode.com';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '..', 'packages', 'contracts', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const GOVERNANCE_PRIVATE_KEY = envContent.match(/PRIVATE_KEY=(.+)/)![1].trim() as Hex;

// 测试参数
const ACCOUNT_A_PRIVATE_KEY = process.env.ACCOUNT_A_KEY as Hex;
const ACCOUNT_B_PRIVATE_KEY = process.env.ACCOUNT_B_KEY as Hex;
const TEST_ROUNDS = Number(process.env.TEST_ROUNDS ?? '2');
const SWAP_INTERVAL_MS = Number(process.env.SWAP_INTERVAL ?? '8000');
const MIN_SWAP_USDC = Number(process.env.MIN_SWAP ?? '0.5');
const MAX_SWAP_USDC = Number(process.env.MAX_SWAP ?? '2');
const LP_WETH_AMOUNT = process.env.LIQUIDITY_AMOUNT ?? '0.003';

const { USDC, WETH } = BASE_SEPOLIA_TOKENS;

// ============ 主测试流程 ============

async function main() {
  console.log('\n🎭 ILAL Mock Theater - SDK 版本');
  console.log('========================================\n');

  // 验证环境变量
  if (!ACCOUNT_A_PRIVATE_KEY || !ACCOUNT_B_PRIVATE_KEY) {
    throw new Error('❌ 错误: 请设置环境变量 ACCOUNT_A_KEY 和 ACCOUNT_B_KEY');
  }

  // 1. 初始化 SDK 客户端
  console.log('📦 初始化 SDK 客户端...\n');

  const governanceClient = ILALClient.fromRPC({
    rpcUrl: RPC_URL,
    chainId: 84532,
    privateKey: GOVERNANCE_PRIVATE_KEY,
  });

  const clientA = ILALClient.fromRPC({
    rpcUrl: RPC_URL,
    chainId: 84532,
    privateKey: ACCOUNT_A_PRIVATE_KEY,
  });

  const clientB = ILALClient.fromRPC({
    rpcUrl: RPC_URL,
    chainId: 84532,
    privateKey: ACCOUNT_B_PRIVATE_KEY,
  });

  const accountA = clientA.getUserAddress()!;
  const accountB = clientB.getUserAddress()!;

  console.log('账户 A (机构巨鲸):', accountA);
  console.log('账户 B (高频交易员):', accountB);

  // 2. 健康检查
  console.log('\n🏥 执行健康检查...\n');
  
  const health = await clientA.healthCheck();
  if (!health.healthy) {
    console.error('❌ 健康检查失败:', health.errors);
    process.exit(1);
  }
  
  console.log('✅ 所有合约可访问');

  // 3. 资金转账（使用 governance 账户）
  console.log('\n💰 转账测试资金...\n');

  // TODO: 实现资金转账逻辑（可选）
  // await transferFunds(governanceClient, accountA, accountB);

  // 4. 激活 Session
  console.log('\n🔐 激活 Session...\n');

  const [hashA, hashB] = await Promise.all([
    clientA.session.activate({ expiry: 24 * 3600 }),
    clientB.session.activate({ expiry: 24 * 3600 }),
  ]);

  console.log('账户 A Session:', hashA);
  console.log('账户 B Session:', hashB);

  // 5. 确认 Session 状态
  const [infoA, infoB] = await Promise.all([
    clientA.session.getInfo(),
    clientB.session.getInfo(),
  ]);

  console.log('\n账户 A Session:', {
    active: infoA.isActive,
    remainingHours: Number(infoA.remainingTime) / 3600,
  });

  console.log('账户 B Session:', {
    active: infoB.isActive,
    remainingHours: Number(infoB.remainingTime) / 3600,
  });

  // 6. 账户 A 添加流动性
  console.log('\n\n💧 账户 A: 添加流动性\n');
  console.log('========================================');

  const poolKey = {
    currency0: USDC,
    currency1: WETH,
    fee: 500,
    tickSpacing: 10,
    hooks: clientA.addresses.complianceHook,
  };

  const liquidityResult = await clientA.liquidity.add({
    poolKey,
    tickLower: 190700,
    tickUpper: 196250,
    amount0Desired: 0n, // 单边 WETH
    amount1Desired: parseEther(LP_WETH_AMOUNT),
    amount0Min: 0n,
    amount1Min: 0n,
  });

  console.log('✅ 流动性已添加');
  console.log('Transaction:', liquidityResult.hash);
  console.log('Token ID:', liquidityResult.tokenId);
  console.log('Liquidity:', liquidityResult.liquidity);

  // 7. 账户 B 执行多轮 Swap
  console.log('\n\n🔄 账户 B: 执行 Swap 测试\n');
  console.log('========================================');

  const swapResults = [];

  for (let i = 0; i < TEST_ROUNDS; i++) {
    console.log(`\n--- Round ${i + 1}/${TEST_ROUNDS} ---`);

    // 随机金额
    const amountUSDC = (Math.random() * (MAX_SWAP_USDC - MIN_SWAP_USDC) + MIN_SWAP_USDC).toFixed(2);
    
    // USDC -> WETH
    console.log(`Swap: ${amountUSDC} USDC -> WETH`);
    
    try {
      const result = await clientB.swap.execute({
        tokenIn: USDC,
        tokenOut: WETH,
        amountIn: parseUnits(amountUSDC, 6),
        slippageTolerance: 1.0,
      });

      console.log('✅ Swap 成功:', result.hash);
      swapResults.push({
        round: i + 1,
        direction: 'USDC->WETH',
        amountIn: amountUSDC,
        hash: result.hash,
        gasUsed: result.gasUsed,
      });
    } catch (error: any) {
      console.error('❌ Swap 失败:', error.message);
    }

    if (i < TEST_ROUNDS - 1) {
      console.log(`等待 ${SWAP_INTERVAL_MS / 1000}s...`);
      await sleep(SWAP_INTERVAL_MS);
    }
  }

  // 8. 结果汇总
  console.log('\n\n📊 测试结果汇总\n');
  console.log('========================================\n');

  console.log('🎭 场景: Mock Theater（双账户）');
  console.log(`📊 Swap 轮次: ${TEST_ROUNDS}`);
  console.log(`✅ 成功: ${swapResults.length}`);
  console.log(`❌ 失败: ${TEST_ROUNDS - swapResults.length}`);

  console.log('\nSwap 详情:');
  swapResults.forEach((r) => {
    console.log(`  Round ${r.round}: ${r.amountIn} USDC -> WETH`);
    console.log(`    Hash: ${r.hash}`);
    console.log(`    Gas: ${r.gasUsed?.toString() || 'N/A'}`);
  });

  // 9. 查询最终余额
  console.log('\n\n💰 最终余额\n');
  console.log('========================================\n');

  const [usdcBalanceA, wethBalanceA, usdcBalanceB, wethBalanceB] = await Promise.all([
    clientA.swap.getBalance(USDC),
    clientA.swap.getBalance(WETH),
    clientB.swap.getBalance(USDC),
    clientB.swap.getBalance(WETH),
  ]);

  console.log('账户 A:');
  console.log(`  USDC: ${formatUnits(usdcBalanceA, 6)}`);
  console.log(`  WETH: ${formatEther(wethBalanceA)}`);

  console.log('\n账户 B:');
  console.log(`  USDC: ${formatUnits(usdcBalanceB, 6)}`);
  console.log(`  WETH: ${formatEther(wethBalanceB)}`);

  console.log('\n\n🎉 测试完成！\n');
}

// ============ 辅助函数 ============

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============ 执行 ============

main().catch((error) => {
  console.error('\n❌ 测试失败:', error);
  process.exit(1);
});
