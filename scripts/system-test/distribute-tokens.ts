/**
 * 分发 WETH 和 USDC
 */

import { createPublicClient, createWalletClient, http, parseEther, parseUnits, formatEther, formatUnits, type Address } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '..', 'packages', 'contracts', '.env') });

const RPC_URL = 'https://base-sepolia-rpc.publicnode.com';
const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;

const governanceAccount = privateKeyToAccount(PRIVATE_KEY);

const ADDRESSES = {
  USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address,
  WETH: '0x4200000000000000000000000000000000000006' as Address,
  accountA: '0xC61d6115fcFcbA97Bd44Cb013C877bD0ef868dB3' as Address,
  accountB: '0xF40493ACDd33cC4a841fCD69577A66218381C2fC' as Address,
};

const ERC20_ABI = [
  {
    inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

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
  console.log('║  分发 WETH 和 USDC                                                ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // 1. 给账户 A 分发 WETH (0.03 WETH for liquidity)
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  给账户 A 分发 0.03 WETH (用于添加流动性)');
  console.log('═══════════════════════════════════════════════════════════');
  try {
    const tx1 = await wallet.writeContract({
      address: ADDRESSES.WETH,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [ADDRESSES.accountA, parseEther('0.03')],
    });
    await publicClient.waitForTransactionReceipt({ hash: tx1 });
    console.log(`✅ 已发送 0.03 WETH 给账户 A`);
    console.log(`   TX: ${tx1}\n`);
  } catch (error: any) {
    console.log(`❌ 失败: ${error.shortMessage || error.message}\n`);
  }

  // 2. 给账户 B 分发 WETH (0.02 WETH)
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  给账户 B 分发 0.02 WETH');
  console.log('═══════════════════════════════════════════════════════════');
  try {
    const tx2 = await wallet.writeContract({
      address: ADDRESSES.WETH,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [ADDRESSES.accountB, parseEther('0.02')],
    });
    await publicClient.waitForTransactionReceipt({ hash: tx2 });
    console.log(`✅ 已发送 0.02 WETH 给账户 B`);
    console.log(`   TX: ${tx2}\n`);
  } catch (error: any) {
    console.log(`❌ 失败: ${error.shortMessage || error.message}\n`);
  }

  // 3. 给账户 B 分发所有剩余 USDC
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  给账户 B 分发 2.5 USDC');
  console.log('═══════════════════════════════════════════════════════════');
  try {
    const tx3 = await wallet.writeContract({
      address: ADDRESSES.USDC,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [ADDRESSES.accountB, parseUnits('2.5', 6)],
    });
    await publicClient.waitForTransactionReceipt({ hash: tx3 });
    console.log(`✅ 已发送 2.5 USDC 给账户 B`);
    console.log(`   TX: ${tx3}\n`);
  } catch (error: any) {
    console.log(`❌ 失败: ${error.shortMessage || error.message}\n`);
  }

  console.log('✅ 分发完成！\n');
  console.log('运行以下命令查看最新余额:');
  console.log('  npx tsx scripts/system-test/check-all-balances.ts\n');
}

main().catch(console.error);
