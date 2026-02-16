/**
 * 检查治理钱包的最近交易
 */

import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

const RPC_URL = 'https://base-sepolia-rpc.publicnode.com';

async function main() {
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const governanceAddress = '0x1b869CaC69Df23Ad9D727932496AEb3605538c8D';
  
  const currentBlock = await publicClient.getBlockNumber();
  console.log(`当前区块: ${currentBlock}`);
  console.log(`治理钱包: ${governanceAddress}`);
  console.log('');
  console.log('🔍 查找治理钱包的最近交易...\n');
  
  let txCount = 0;
  
  // 检查最近 200 个区块
  for (let i = 0; i < 200 && txCount < 10; i++) {
    const blockNum = currentBlock - BigInt(i);
    const block = await publicClient.getBlock({ 
      blockNumber: blockNum,
      includeTransactions: true 
    });
    
    const govTxs = (block.transactions as any[]).filter(
      tx => tx.from?.toLowerCase() === governanceAddress.toLowerCase()
    );
    
    if (govTxs.length > 0) {
      const timestamp = new Date(Number(block.timestamp) * 1000);
      
      for (const tx of govTxs) {
        txCount++;
        const receipt = await publicClient.getTransactionReceipt({ hash: tx.hash });
        console.log(`✅ 交易 #${txCount}`);
        console.log(`   时间: ${timestamp.toLocaleString('zh-CN')}`);
        console.log(`   TX: ${tx.hash}`);
        console.log(`   接收者: ${tx.to}`);
        console.log(`   金额: ${tx.value > 0 ? (Number(tx.value) / 1e18).toFixed(6) + ' ETH' : '合约交互'}`);
        console.log(`   状态: ${receipt.status}`);
        console.log(`   区块: ${receipt.blockNumber.toString()}`);
        console.log(`   链接: https://sepolia.basescan.org/tx/${tx.hash}`);
        console.log('');
      }
    }
  }
  
  if (txCount === 0) {
    console.log('❌ 未找到治理钱包的交易（可能超出检查范围）');
  } else {
    console.log(`\n✅ 共找到 ${txCount} 笔交易`);
  }
}

main().catch(console.error);
