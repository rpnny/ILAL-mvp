/**
 * 准备大规模演示
 * 1. 分发 ETH 给账户 A 和 B
 * 2. Wrap ETH 为 WETH 并分发
 */

import { createPublicClient, createWalletClient, http, parseEther, formatEther, type Address } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '..', '..', 'packages', 'contracts', '.env') });

const RPC_URL = 'https://base-sepolia-rpc.publicnode.com';
const GOVERNANCE_PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;

if (!GOVERNANCE_PRIVATE_KEY) {
  console.error('❌ 请先设置环境变量 PRIVATE_KEY');
  process.exit(1);
}

const governanceAccount = privateKeyToAccount(GOVERNANCE_PRIVATE_KEY);

const ADDRESSES = {
  WETH: '0x4200000000000000000000000000000000000006' as Address,
  accountA: '0xC61d6115fcFcbA97Bd44Cb013C877bD0ef868dB3' as Address,
  accountB: '0xF40493ACDd33cC4a841fCD69577A66218381C2fC' as Address,
};

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

const wallet = createWalletClient({
  account: governanceAccount,
  chain: baseSepolia,
  transport: http(RPC_URL),
});

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  准备大规模演示                                                   ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
  
  console.log(`治理钱包: ${governanceAccount.address}\n`);

  // 检查初始余额
  const govBalance = await publicClient.getBalance({ address: governanceAccount.address });
  console.log(`💰 治理钱包余额: ${formatEther(govBalance)} ETH\n`);

  // 1. 分发 ETH 给账户 A (0.02 ETH for gas)
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  步骤 1: 分发 ETH 给账户 A');
  console.log('═══════════════════════════════════════════════════════════');
  try {
    const tx1 = await wallet.sendTransaction({
      to: ADDRESSES.accountA,
      value: parseEther('0.02'),
    });
    await publicClient.waitForTransactionReceipt({ hash: tx1 });
    console.log(`✅ 已发送 0.02 ETH 给账户 A`);
    console.log(`   TX: ${tx1}\n`);
  } catch (error: any) {
    console.log(`❌ 失败: ${error.shortMessage || error.message}\n`);
  }

  // 2. 分发 ETH 给账户 B (0.02 ETH for gas)
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  步骤 2: 分发 ETH 给账户 B');
  console.log('═══════════════════════════════════════════════════════════');
  try {
    const tx2 = await wallet.sendTransaction({
      to: ADDRESSES.accountB,
      value: parseEther('0.02'),
    });
    await publicClient.waitForTransactionReceipt({ hash: tx2 });
    console.log(`✅ 已发送 0.02 ETH 给账户 B`);
    console.log(`   TX: ${tx2}\n`);
  } catch (error: any) {
    console.log(`❌ 失败: ${error.shortMessage || error.message}\n`);
  }

  // 3. Wrap 剩余 ETH 为 WETH
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  步骤 3: Wrap ETH 为 WETH');
  console.log('═══════════════════════════════════════════════════════════');
  
  const remainingBalance = await publicClient.getBalance({ address: governanceAccount.address });
  const wrapAmount = remainingBalance - parseEther('0.05'); // 保留 0.05 ETH for gas
  
  if (wrapAmount > 0n) {
    console.log(`💎 准备 Wrap ${formatEther(wrapAmount)} ETH → WETH...`);
    try {
      const tx3 = await wallet.sendTransaction({
        to: ADDRESSES.WETH,
        value: wrapAmount,
        data: '0xd0e30db0', // deposit()
      });
      await publicClient.waitForTransactionReceipt({ hash: tx3 });
      console.log(`✅ 已 Wrap ${formatEther(wrapAmount)} WETH`);
      console.log(`   TX: ${tx3}\n`);
    } catch (error: any) {
      console.log(`❌ 失败: ${error.shortMessage || error.message}\n`);
    }
  } else {
    console.log(`⚠️ ETH 余额不足，跳过 Wrap\n`);
  }

  // 4. 最终余额
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  最终余额');
  console.log('═══════════════════════════════════════════════════════════');
  
  const finalGovBalance = await publicClient.getBalance({ address: governanceAccount.address });
  const accountABalance = await publicClient.getBalance({ address: ADDRESSES.accountA });
  const accountBBalance = await publicClient.getBalance({ address: ADDRESSES.accountB });
  
  console.log(`治理钱包: ${formatEther(finalGovBalance)} ETH`);
  console.log(`账户 A:   ${formatEther(accountABalance)} ETH`);
  console.log(`账户 B:   ${formatEther(accountBBalance)} ETH`);
  
  console.log('\n✅ 准备完成！');
  console.log('\n下一步:');
  console.log('  1. 查看所有余额: npx tsx scripts/system-test/check-all-balances.ts');
  console.log('  2. 运行大规模演示: 我会修改 mock-theater.ts 参数');
}

main().catch(console.error);
