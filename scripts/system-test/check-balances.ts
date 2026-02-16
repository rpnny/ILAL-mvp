/**
 * 快速检查账户余额
 */

import { createPublicClient, http, formatEther, formatUnits, type Address } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const RPC_URL = 'https://base-sepolia-rpc.publicnode.com';

const ADDRESSES = {
  USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address,
  WETH: '0x4200000000000000000000000000000000000006' as Address,
};

const ERC20_ABI = [
  { type: 'function', name: 'balanceOf', inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'decimals', inputs: [], outputs: [{ name: '', type: 'uint8' }], stateMutability: 'view' },
] as const;

async function main() {
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  // 从环境变量读取私钥
  const accountAKey = process.env.ACCOUNT_A_KEY as `0x${string}`;
  const accountBKey = process.env.ACCOUNT_B_KEY as `0x${string}`;

  if (!accountAKey || !accountBKey) {
    console.error('❌ 请先设置环境变量 ACCOUNT_A_KEY 和 ACCOUNT_B_KEY');
    process.exit(1);
  }

  const accountA = privateKeyToAccount(accountAKey);
  const accountB = privateKeyToAccount(accountBKey);

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  账户余额检查                                            ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // 检查账户 A
  console.log('📊 账户 A (机构巨鲸)');
  console.log(`   地址: ${accountA.address}`);
  
  const aEth = await publicClient.getBalance({ address: accountA.address });
  const aUsdc = await publicClient.readContract({
    address: ADDRESSES.USDC,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [accountA.address],
  });
  const aWeth = await publicClient.readContract({
    address: ADDRESSES.WETH,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [accountA.address],
  });

  console.log(`   ETH:  ${formatEther(aEth)}`);
  console.log(`   USDC: ${formatUnits(aUsdc, 6)}`);
  console.log(`   WETH: ${formatEther(aWeth)}`);
  console.log('');

  // 检查账户 B
  console.log('📊 账户 B (高频交易员)');
  console.log(`   地址: ${accountB.address}`);
  
  const bEth = await publicClient.getBalance({ address: accountB.address });
  const bUsdc = await publicClient.readContract({
    address: ADDRESSES.USDC,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [accountB.address],
  });
  const bWeth = await publicClient.readContract({
    address: ADDRESSES.WETH,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [accountB.address],
  });

  console.log(`   ETH:  ${formatEther(bEth)}`);
  console.log(`   USDC: ${formatUnits(bUsdc, 6)}`);
  console.log(`   WETH: ${formatEther(bWeth)}`);
  console.log('');

  // 检查是否有足够的余额
  const hasEnoughA = aEth > 0n && aWeth > 0n;
  const hasEnoughB = bEth > 0n && (bUsdc > 0n || bWeth > 0n);

  if (hasEnoughA && hasEnoughB) {
    console.log('✅ 两个账户都有足够的余额，可以开始测试！');
  } else {
    console.log('⚠️  警告: 某些账户余额不足，可能需要从治理钱包分发资金');
  }
}

main().catch(console.error);
