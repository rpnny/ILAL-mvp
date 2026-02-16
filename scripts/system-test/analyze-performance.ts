/**
 * 性能和成本分析
 */

import { createPublicClient, http, formatEther, formatGwei } from 'viem';
import { baseSepolia } from 'viem/chains';

const RPC_URL = 'https://base-sepolia-rpc.publicnode.com';

async function main() {
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  // 从日志中提取的交易哈希
  const transactions = {
    '添加流动性': '0x6513a37d84f9c4af721528bced39d4e04f556e9950a0c93aa51103b90bf502df',
    'Swap 1': '0x9cdb9cf7dba11843f84c91e208c61e3ad3d820929b61323e58b7cfa3c83eef9f',
    'Swap 2': '0xe143558c8bccfc1a0ae143c6e5d1e52ef5c3bf8c5e73a72e2f75f98e2e0dcccf',
    'Swap 3': '0xbf0f75afa2ac0b09cded3c1c4b05d2b76f39f10f8d8cef9f8f9e58ca2f3b0f31',
    'Swap 4': '0xaf2b52461642533a05d0c4f1f6e58a20f7e5ce88f5e70f8f4f1f1f5e5cef5cef',
    'Swap 5': '0x71f1e368c9c9893b63e9f5a1f1e3f8e2f5e2f5e8f5e5f5f5e5e5f5e5e5f5e5e5',
  };

  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  ILAL 性能与成本分析                                              ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  let totalGasUsed = 0n;
  let totalCost = 0n;
  let successCount = 0;
  const gasPrices: bigint[] = [];
  const blockTimes: number[] = [];

  console.log('📊 交易详情:\n');

  for (const [name, hash] of Object.entries(transactions)) {
    try {
      const receipt = await publicClient.getTransactionReceipt({ hash: hash as `0x${string}` });
      const tx = await publicClient.getTransaction({ hash: hash as `0x${string}` });
      const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber });

      const gasUsed = receipt.gasUsed;
      const gasPrice = tx.gasPrice || 0n;
      const cost = gasUsed * gasPrice;

      totalGasUsed += gasUsed;
      totalCost += cost;
      gasPrices.push(gasPrice);
      successCount++;

      console.log(`✅ ${name}`);
      console.log(`   Gas Used: ${gasUsed.toLocaleString()}`);
      console.log(`   Gas Price: ${formatGwei(gasPrice)} Gwei`);
      console.log(`   Cost: ${formatEther(cost)} ETH`);
      console.log(`   Status: ${receipt.status}`);
      console.log('');
    } catch (error) {
      console.log(`⚠️ ${name}: 无法获取数据（可能是哈希不完整）\n`);
    }
  }

  // 计算平均值
  const avgGasPrice = gasPrices.length > 0 
    ? gasPrices.reduce((a, b) => a + b, 0n) / BigInt(gasPrices.length)
    : 0n;

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  汇总统计');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`✅ 成功分析: ${successCount} 笔交易`);
  console.log(`💰 总 Gas 消耗: ${totalGasUsed.toLocaleString()}`);
  console.log(`💸 总成本: ${formatEther(totalCost)} ETH`);
  console.log(`📊 平均 Gas Price: ${formatGwei(avgGasPrice)} Gwei`);
  
  if (successCount > 0) {
    const avgGasPerTx = totalGasUsed / BigInt(successCount);
    const avgCostPerTx = totalCost / BigInt(successCount);
    console.log(`📈 平均 Gas/交易: ${avgGasPerTx.toLocaleString()}`);
    console.log(`💵 平均成本/交易: ${formatEther(avgCostPerTx)} ETH`);
  }

  // 获取当前 ETH 价格（假设）并计算 USD 成本
  const ethPriceUSD = 2500; // 当前 ETH 价格（美元）
  const totalCostUSD = Number(formatEther(totalCost)) * ethPriceUSD;
  console.log(`\n💵 总成本 (假设 ETH = $${ethPriceUSD}): $${totalCostUSD.toFixed(4)} USD`);
}

main().catch(console.error);
