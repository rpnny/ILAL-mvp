/**
 * 验证交易是否真实存在
 */

import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

const RPC_URL = 'https://base-sepolia-rpc.publicnode.com';

async function main() {
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  // 验证添加流动性的交易
  const txHash = '0x55d8fa3eb80f235822f279be4ef4ea52c19f03aba037c5f5f9ff811406c5526d';
  
  console.log('🔍 验证交易:', txHash);
  console.log('');
  
  try {
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash as any });
    
    console.log('✅ 交易存在！');
    console.log('   状态:', receipt.status);
    console.log('   区块:', receipt.blockNumber);
    console.log('   Gas 使用:', receipt.gasUsed.toString());
    console.log('   发送者:', receipt.from);
    console.log('   接收者:', receipt.to);
    console.log('');
    console.log('🔗 查看详情:', `https://sepolia.basescan.org/tx/${txHash}`);
  } catch (error) {
    console.log('❌ 交易不存在或无法访问');
    console.log('   错误:', error);
  }
}

main().catch(console.error);
