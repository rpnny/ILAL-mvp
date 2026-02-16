/**
 * 验证多笔交易
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
    '0x55d8fa3eb80f235822f279be4ef4ea52c19f03aba037c5f5f9ff811406c5526d', // 添加流动性
    '0x3c314ed34780726c49e0d00c18c5d3dd0e8269c6e0e19f4ff868c31f8c0cfb2e', // Swap #1
    '0x592714d9fef20fa999c52097e3dcf66d11c05c8c9dadc193e46331aa2ddbc4f9', // Swap #2
    '0xbf8551250cc9c61b6e0f76c62629cf9ef5da6f7cfec4f2df3acc8f5e5e62db98', // Swap #3
    '0x1059fd0f04395f12e9a0f94dcd47c8e08d7ba0bee05f4c28e18aa8ad16bdb820', // Swap #4
    '0xc741b7305be1d77c4feb7416b84d40e6d5e5f6a49f8eb939d3fa51ec10a0f6cf', // Swap #5
  ];

  console.log('🔍 验证 Mock Theater 交易...\n');

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
      console.log('');
    } catch (error) {
      console.log(`❌ 交易 ${i + 1}: ${shortHash} - 不存在或无法访问`);
      console.log('');
    }
  }
}

main().catch(console.error);
