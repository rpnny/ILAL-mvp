/**
 * 检查所有账户余额
 */

import { createPublicClient, http, formatEther, formatUnits, type Address } from 'viem';
import { baseSepolia } from 'viem/chains';

const RPC_URL = 'https://base-sepolia-rpc.publicnode.com';

const ADDRESSES = {
  USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address,
  WETH: '0x4200000000000000000000000000000000000006' as Address,
};

const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

async function main() {
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const accounts = {
    '治理钱包': '0x1b869CaC69Df23Ad9D727932496AEb3605538c8D' as Address,
    '账户 A (LP)': '0xC61d6115fcFcbA97Bd44Cb013C877bD0ef868dB3' as Address,
    '账户 B (Trader)': '0xF40493ACDd33cC4a841fCD69577A66218381C2fC' as Address,
  };

  console.log('💰 检查所有账户余额...\n');

  for (const [name, address] of Object.entries(accounts)) {
    console.log(`\n📍 ${name}`);
    console.log(`   地址: ${address}`);
    
    try {
      const ethBalance = await publicClient.getBalance({ address });
      const usdcBalance = await publicClient.readContract({
        address: ADDRESSES.USDC,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address],
      });
      const wethBalance = await publicClient.readContract({
        address: ADDRESSES.WETH,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address],
      });

      console.log(`   ETH:  ${formatEther(ethBalance)}`);
      console.log(`   USDC: ${formatUnits(usdcBalance, 6)}`);
      console.log(`   WETH: ${formatEther(wethBalance)}`);
    } catch (error) {
      console.log(`   ❌ 查询失败: ${error}`);
    }
  }
}

main().catch(console.error);
