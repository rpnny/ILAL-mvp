/**
 * 验证最新的交易
 */

import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

const RPC_URL = 'https://base-sepolia-rpc.publicnode.com';

async function main() {
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const txHashes = [
    '0xe1b32b75701ade1151ba8d20fda2f490dedaf140ec15773d3fcbd69835ce4ede', // 添加流动性
    '0x380039823fcbc3bdde15b33834dd7e6a5aac9bebc7b6bbc89ca1a2bb63e7c5fa', // Swap #1
    '0x50f095c453426228eeb1a2f8e93c1f21eb9d5fd0ee3c8a7f81c93834c93cd959', // Swap #2
    '0x4b4c54f1e6aba4b9806e5cd0a4c0d6e1fddec37e65e91be63dfad1f1f62da22c', // Swap #3
    '0xad5b88382b2c9a273fc7a1ba867f0f73bdf3f1b0e5d01c8dda91c8b5a71b7ea9', // Swap #4
    '0x8643e578d2368e2707ac31f5b9ad9ec5ce18fd2d8ca9e40e5c86fed3c18ca72f', // Swap #5
  ];

  console.log('🔍 验证最新 Mock Theater 交易...\n');

  for (let i = 0; i < txHashes.length; i++) {
    const txHash = txHashes[i];
    const shortHash = txHash.slice(0, 10) + '...';
    
    try {
      const receipt = await publicClient.getTransactionReceipt({ hash: txHash as any });
      const tx = await publicClient.getTransaction({ hash: txHash as any });
      const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber });
      
      const timestamp = new Date(Number(block.timestamp) * 1000);
      
      console.log(`✅ 交易 ${i + 1}: ${shortHash}`);
      console.log(`   时间: ${timestamp.toLocaleString('zh-CN')}`);
      console.log(`   状态: ${receipt.status}`);
      console.log(`   Gas: ${receipt.gasUsed.toString()}`);
      console.log(`   区块: ${receipt.blockNumber.toString()}`);
      console.log(`   发送者: ${tx.from.slice(0, 10)}...`);
      console.log('');
    } catch (error) {
      console.log(`❌ 交易 ${i + 1}: ${shortHash} - 不存在或无法访问`);
      console.log('');
    }
  }
}

main().catch(console.error);
