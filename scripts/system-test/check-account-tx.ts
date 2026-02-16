/**
 * 检查账户的最近交易
 */

import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

const RPC_URL = 'https://base-sepolia-rpc.publicnode.com';

async function main() {
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const accountB = '0xF40493ACDd33cC4a841fCD69577A66218381C2fC';
  
  const currentBlock = await publicClient.getBlockNumber();
  console.log(`当前区块: ${currentBlock}`);
  console.log(`账户 B: ${accountB}`);
  console.log('');
  
  // 获取最近 5 个区块的交易
  console.log('🔍 检查最近区块的交易...\n');
  
  for (let i = 0; i < 50; i++) {
    const blockNum = currentBlock - BigInt(i);
    const block = await publicClient.getBlock({ 
      blockNumber: blockNum,
      includeTransactions: true 
    });
    
    const accountBTxs = (block.transactions as any[]).filter(
      tx => tx.from?.toLowerCase() === accountB.toLowerCase()
    );
    
    if (accountBTxs.length > 0) {
      const timestamp = new Date(Number(block.timestamp) * 1000);
      console.log(`\n区块 ${blockNum} (${timestamp.toLocaleString('zh-CN')})`);
      
      for (const tx of accountBTxs) {
        const receipt = await publicClient.getTransactionReceipt({ hash: tx.hash });
        console.log(`  ✅ TX: ${tx.hash.slice(0, 20)}...`);
        console.log(`     状态: ${receipt.status}`);
        console.log(`     To: ${tx.to?.slice(0, 20)}...`);
        console.log(`     Gas: ${receipt.gasUsed.toString()}`);
      }
    }
  }
}

main().catch(console.error);
