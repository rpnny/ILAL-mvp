/**
 * 分析账户 A 和 B 的所有交易
 */

import { createPublicClient, http, formatEther, formatGwei } from 'viem';
import { baseSepolia } from 'viem/chains';

const RPC_URL = 'https://base-sepolia-rpc.publicnode.com';

async function main() {
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const accountA = '0xC61d6115fcFcbA97Bd44Cb013C877bD0ef868dB3';
  const accountB = '0xF40493ACDd33cC4a841fCD69577A66218381C2fC';

  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  ILAL Mock Theater 性能与成本完整分析                             ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const currentBlock = await publicClient.getBlockNumber();
  const startBlock = currentBlock - 1000n; // 检查最近 1000 个区块

  const transactions: any[] = [];
  
  console.log('🔍 扫描最近的交易...\n');

  // 收集交易
  for (let i = 0n; i < 1000n; i++) {
    const blockNum = currentBlock - i;
    try {
      const block = await publicClient.getBlock({ 
        blockNumber: blockNum,
        includeTransactions: true 
      });

      const relevantTxs = (block.transactions as any[]).filter(
        tx => tx.from?.toLowerCase() === accountA.toLowerCase() || 
              tx.from?.toLowerCase() === accountB.toLowerCase()
      );

      for (const tx of relevantTxs) {
        const receipt = await publicClient.getTransactionReceipt({ hash: tx.hash });
        const timestamp = new Date(Number(block.timestamp) * 1000);
        
        // 只统计今天的交易
        const today = new Date();
        if (timestamp.getDate() === today.getDate() && 
            timestamp.getMonth() === today.getMonth()) {
          transactions.push({
            hash: tx.hash,
            from: tx.from,
            to: tx.to,
            gasUsed: receipt.gasUsed,
            gasPrice: tx.gasPrice || 0n,
            cost: receipt.gasUsed * (tx.gasPrice || 0n),
            status: receipt.status,
            timestamp,
            block: receipt.blockNumber,
          });
        }
      }

      if (transactions.length >= 20) break; // 找到足够的交易就停止
    } catch (error) {
      // 跳过错误
    }
  }

  // 按时间排序
  transactions.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  console.log(`✅ 找到 ${transactions.length} 笔今天的交易\n`);

  // 分类统计
  const liquidityTxs: any[] = [];
  const swapTxs: any[] = [];
  const sessionTxs: any[] = [];
  const otherTxs: any[] = [];

  let totalGas = 0n;
  let totalCost = 0n;
  const gasPrices: bigint[] = [];

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  交易详情');
  console.log('═══════════════════════════════════════════════════════════\n');

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    const account = tx.from.toLowerCase() === accountA.toLowerCase() ? 'A' : 'B';
    
    console.log(`${i + 1}. 账户 ${account} - ${tx.hash.slice(0, 20)}...`);
    console.log(`   时间: ${tx.timestamp.toLocaleTimeString('zh-CN')}`);
    console.log(`   Gas Used: ${tx.gasUsed.toLocaleString()}`);
    console.log(`   Gas Price: ${formatGwei(tx.gasPrice)} Gwei`);
    console.log(`   Cost: ${formatEther(tx.cost)} ETH ($${(Number(formatEther(tx.cost)) * 2500).toFixed(4)})`);
    console.log(`   Status: ${tx.status === 'success' ? '✅' : '❌'}`);
    console.log('');

    totalGas += tx.gasUsed;
    totalCost += tx.cost;
    gasPrices.push(tx.gasPrice);

    // 分类（基于 gas 使用量估算）
    if (tx.gasUsed > 300000n) {
      liquidityTxs.push(tx);
    } else if (tx.gasUsed > 100000n) {
      swapTxs.push(tx);
    } else if (tx.gasUsed > 40000n) {
      sessionTxs.push(tx);
    } else {
      otherTxs.push(tx);
    }
  }

  // 计算统计数据
  const avgGasPrice = gasPrices.length > 0 
    ? gasPrices.reduce((a, b) => a + b, 0n) / BigInt(gasPrices.length)
    : 0n;
  const avgGasPerTx = transactions.length > 0 
    ? totalGas / BigInt(transactions.length)
    : 0n;
  const avgCostPerTx = transactions.length > 0 
    ? totalCost / BigInt(transactions.length)
    : 0n;

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  总体统计');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📊 总交易数: ${transactions.length} 笔`);
  console.log(`   ├─ 添加流动性: ${liquidityTxs.length} 笔`);
  console.log(`   ├─ Swap 交易: ${swapTxs.length} 笔`);
  console.log(`   ├─ Session 激活: ${sessionTxs.length} 笔`);
  console.log(`   └─ 其他 (Approve等): ${otherTxs.length} 笔`);
  console.log('');
  console.log(`💰 总 Gas 消耗: ${totalGas.toLocaleString()}`);
  console.log(`📈 平均 Gas/交易: ${avgGasPerTx.toLocaleString()}`);
  console.log(`📊 平均 Gas Price: ${formatGwei(avgGasPrice)} Gwei`);
  console.log('');
  console.log(`💸 总成本: ${formatEther(totalCost)} ETH`);
  console.log(`💵 平均成本/交易: ${formatEther(avgCostPerTx)} ETH`);
  console.log('');
  console.log(`💵 总成本 (USD, ETH=$2500): $${(Number(formatEther(totalCost)) * 2500).toFixed(4)}`);
  console.log(`💵 平均成本/交易 (USD): $${(Number(formatEther(avgCostPerTx)) * 2500).toFixed(4)}`);

  // 分类统计
  if (liquidityTxs.length > 0) {
    const avgLiqGas = liquidityTxs.reduce((sum, tx) => sum + tx.gasUsed, 0n) / BigInt(liquidityTxs.length);
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  流动性操作统计');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📊 平均 Gas: ${avgLiqGas.toLocaleString()}`);
  }

  if (swapTxs.length > 0) {
    const avgSwapGas = swapTxs.reduce((sum, tx) => sum + tx.gasUsed, 0n) / BigInt(swapTxs.length);
    const avgSwapCost = swapTxs.reduce((sum, tx) => sum + tx.cost, 0n) / BigInt(swapTxs.length);
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  Swap 交易统计');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📊 总数: ${swapTxs.length} 笔`);
    console.log(`📈 平均 Gas: ${avgSwapGas.toLocaleString()}`);
    console.log(`💵 平均成本: ${formatEther(avgSwapCost)} ETH ($${(Number(formatEther(avgSwapCost)) * 2500).toFixed(4)})`);
  }

  // 速度分析
  if (transactions.length > 1) {
    const firstTx = transactions[0];
    const lastTx = transactions[transactions.length - 1];
    const duration = (lastTx.timestamp.getTime() - firstTx.timestamp.getTime()) / 1000;
    const txPerMin = (transactions.length / duration) * 60;
    
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  执行速度统计');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`⏱️  总执行时间: ${Math.floor(duration / 60)} 分 ${Math.floor(duration % 60)} 秒`);
    console.log(`📊 交易吞吐量: ${txPerMin.toFixed(2)} 笔/分钟`);
    console.log(`⏱️  平均交易间隔: ${(duration / transactions.length).toFixed(2)} 秒`);
  }
}

main().catch(console.error);
