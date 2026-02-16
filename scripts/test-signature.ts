/**
 * 测试真实的 EIP-712 签名生成和验证
 */

import { createPublicClient, createWalletClient, http, encodeAbiParameters, hexToBigInt, keccak256, concat, toHex, pad, toBytes } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '../.env') });

const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'),
});

const walletClient = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'),
});

const COMPLIANCE_HOOK = '0xDeDcFDF10b03AB45eEbefD2D91EDE66D9E5c8a80';

const COMPLIANCE_HOOK_ABI = [
  {
    type: 'function',
    name: 'nonces',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'verifySwapPermitView',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'deadline', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
] as const;

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           测试 EIP-712 签名生成和验证                      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log();
  console.log(`User: ${account.address}`);
  console.log();

  // 1. 获取 nonce
  console.log('【1/4】获取当前 nonce...');
  
  const nonce = await publicClient.readContract({
    address: COMPLIANCE_HOOK as `0x${string}`,
    abi: COMPLIANCE_HOOK_ABI,
    functionName: 'nonces',
    args: [account.address],
  });

  console.log(`  Nonce: ${nonce.toString()}`);
  console.log();

  // 2. 生成签名参数
  console.log('【2/4】生成签名参数...');
  
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600); // 10 minutes
  
  console.log(`  User: ${account.address}`);
  console.log(`  Deadline: ${deadline.toString()} (${new Date(Number(deadline) * 1000).toLocaleString()})`);
  console.log(`  Nonce: ${nonce.toString()}`);
  console.log();

  // 3. 使用 viem 的 signTypedData 生成签名
  console.log('【3/4】使用 viem 生成 EIP-712 签名...');
  
  const domain = {
    name: 'ILAL ComplianceHook',
    version: '1',
    chainId: 84532,
    verifyingContract: COMPLIANCE_HOOK as `0x${string}`,
  };

  const types = {
    SwapPermit: [
      { name: 'user', type: 'address' },
      { name: 'deadline', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
    ],
  };

  const message = {
    user: account.address,
    deadline,
    nonce,
  };

  console.log('  Domain:', domain);
  console.log('  Message:', message);
  console.log();

  const signature = await walletClient.signTypedData({
    account,
    domain,
    types,
    primaryType: 'SwapPermit',
    message,
  });

  console.log('  ✅ 签名成功！');
  console.log(`  Signature: ${signature}`);
  console.log(`  Signature length: ${signature.length} chars (${(signature.length - 2) / 2} bytes)`);
  console.log();

  // 4. 通过合约验证签名
  console.log('【4/4】通过合约验证签名...');
  
  try {
    const isValid = await publicClient.readContract({
      address: COMPLIANCE_HOOK as `0x${string}`,
      abi: COMPLIANCE_HOOK_ABI,
      functionName: 'verifySwapPermitView',
      args: [account.address, deadline, nonce, signature],
    });

    if (isValid) {
      console.log('  ✅ 签名验证成功！');
      console.log();
      console.log('╔══════════════════════════════════════════════════════════════╗');
      console.log('║                签名没有问题！                                ║');
      console.log('║  问题可能在其他地方（Pool 状态、余额、授权等）              ║');
      console.log('╚══════════════════════════════════════════════════════════════╝');
    } else {
      console.log('  ❌ 签名验证失败！');
      console.log('  🔍 可能的原因:');
      console.log('     - 域分隔符不匹配');
      console.log('     - 类型哈希不匹配');
      console.log('     - 签名格式错误（v, r, s）');
      console.log();
      console.log('  调试信息:');
      console.log(`     Expected nonce: ${nonce.toString()}`);
      console.log(`     Deadline: ${deadline.toString()}`);
      console.log(`     User: ${account.address}`);
    }
  } catch (error: any) {
    console.log('  ❌ 调用验证函数失败！');
    console.log('  Error:', error.message || error);
  }

  console.log();

  // 5. 构造完整的 hookData（用于实际 swap）
  console.log('【额外】构造完整的 hookData...');
  
  const hookData = encodeAbiParameters(
    [
      { type: 'address' },
      { type: 'uint256' },
      { type: 'uint256' },
      { type: 'bytes' },
    ],
    [account.address, deadline, nonce, signature]
  );

  console.log(`  Hook Data: ${hookData.slice(0, 100)}...`);
  console.log(`  Hook Data length: ${hookData.length} chars (${(hookData.length - 2) / 2} bytes)`);
  
  if (hookData.length < 296) {  // 148 bytes * 2 = 296 chars (not including "0x")
    console.log('  ⚠️  Hook data 太短！可能无法触发完整签名验证');
  } else {
    console.log('  ✅ Hook data 长度正常，会触发完整签名验证');
  }
}

main().catch(console.error);
